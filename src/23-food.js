/* ================= FOOD / CALORIES ================= */
var FMEALS=[['breakfast','Breakfast','🍳'],['lunch','Lunch','🥗'],['dinner','Dinner','🍲'],['snacks','Snacks','🍎']];
var FMEAL_NAME={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snacks:'Snacks'};
var FOODS=[
/*FOODS*/
].map(function(a){return {name:a[0],serving:a[1],cal:a[2],p:a[3],c:a[4],f:a[5],k:a[6],a:a[7],w:a[8]}});
var UNIT_SHORT={g:'g',ml:'ml',pc:'pc'};
function goalOf(uid){var m=S.members[uid]||{};return m.goal>0?m.goal:2000}
function dayEntries(uid,date){var d=ucol(uid,'days').get(date);return d&&d.entries?d.entries:[]}
function sumEntries(list){var t={cal:0,p:0,c:0,f:0};(list||[]).forEach(function(e){t.cal+=e.cal||0;t.p+=e.p||0;t.c+=e.c||0;t.f+=e.f||0});return t}
function foodSummary(uid,date){var t=sumEntries(dayEntries(uid,date));return {cal:t.cal,goal:goalOf(uid),p:t.p,c:t.c,f:t.f}}
function entryFrom(food,servings,meal,disp){
  return {id:newId(),meal:meal,name:food.name,serving:food.serving||'',qty:r1(servings*100)/100,disp:disp||'',cal:Math.round(food.cal*servings),p:r1((food.p||0)*servings),c:r1((food.c||0)*servings),f:r1((food.f||0)*servings)};
}
function addEntries(date,entries){
  var c=ucol(S.uid,'days'),d=c.get(date)||{id:date,date:date,entries:[]};
  c.save(Object.assign({},d,{id:date,date:date,entries:d.entries.concat(entries)}));
}
function removeEntry(date,id){
  var c=ucol(S.uid,'days'),d=c.get(date);if(!d)return;
  var i=d.entries.findIndex(function(e){return e.id===id});if(i<0)return;
  var gone=d.entries[i],rest=d.entries.filter(function(e){return e.id!==id});
  c.save(Object.assign({},d,{entries:rest}));
  toast('Removed '+gone.name,'Undo',function(){var d2=c.get(date)||{id:date,date:date,entries:[]};c.save(Object.assign({},d2,{entries:d2.entries.concat([gone])}))});
}
function defaultFMeal(){var m=new Date().getHours()*60+new Date().getMinutes();return m<630?'breakfast':m<900?'lunch':m<1260?'dinner':'snacks'}

/* search helpers */
function lev(a,b){var m=a.length,n=b.length,i,j,row=[],prev,tmp;for(j=0;j<=n;j++)row[j]=j;for(i=1;i<=m;i++){prev=row[0];row[0]=i;for(j=1;j<=n;j++){tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a.charAt(i-1)===b.charAt(j-1)?0:1));prev=tmp}}return row[n]}
function scoreFood(f,toks){
  var name=f.name.toLowerCase(),words=name.split(/[^a-z0-9]+/).filter(Boolean),total=0;
  for(var i=0;i<toks.length;i++){var t=toks[i],s=0;
    if(words.some(function(w){return w.indexOf(t)===0}))s=4;
    else if(name.indexOf(t)>=0)s=3;
    else if(t.length>=3&&words.some(function(w){return lev(t,w.slice(0,t.length))<=1}))s=2;
    else if(t.length>=4&&words.some(function(w){return lev(t,w)<=2}))s=1.5;
    if(!s)return 0;total+=s}
  return total+(f.mine?0.5:0)-name.length/1000;
}
function sameFood(a,b){return a.name.trim().toLowerCase()===b.name.trim().toLowerCase()&&(a.serving||'').trim().toLowerCase()===(b.serving||'').trim().toLowerCase()}
function myFoods(){return ucol(S.uid,'foods').items}
function allFoods(){
  var mine=myFoods().map(function(f){return Object.assign({},f,{mine:true})});
  return mine.concat(FOODS.filter(function(f){return !mine.some(function(m){return sameFood(m,f)})}));
}
function recentFoods(){
  var all=allFoods(),out=[],seen={},days=ucol(S.uid,'days').items.slice().sort(function(a,b){return a.date<b.date?1:-1});
  days.some(function(d){d.entries.slice().reverse().some(function(e){
    var f=all.filter(function(x){return sameFood(x,e)})[0];
    if(f&&!seen[f.name+'|'+f.serving]){seen[f.name+'|'+f.serving]=1;out.push(f)}return out.length>=6});return out.length>=6});
  return out;
}
function rememberFood(f){
  var c=ucol(S.uid,'foods'),ex=c.items.filter(function(x){return sameFood(x,f)})[0];
  var rec={id:ex?ex.id:newId(),name:f.name,serving:f.serving||'1 serving',cal:Math.round(f.cal),p:r1(f.p||0),c:r1(f.c||0),f:r1(f.f||0)};
  if(f.k){rec.k=f.k;rec.a=f.a;if(f.w)rec.w=f.w}
  c.save(rec);
}
function unitsFor(f){
  var u=[{u:'serving',label:'serving',per:1,step:0.5}];
  if(f.k==='g'&&f.a)u.push({u:'g',label:'grams (g)',per:f.a,step:10});
  if(f.k==='ml'&&f.a)u.push({u:'ml',label:'millilitres (ml)',per:f.a,step:10});
  if(f.k==='pc'&&f.a)u.push({u:'pc',label:'pieces',per:f.a,step:1});
  if(f.k&&f.k!=='g'&&f.w)u.push({u:'g',label:'grams (g)',per:f.w,step:10});
  return u;
}
function searchPackaged(q){
  var url='https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(q)+'&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments';
  return fetch(url).then(function(r){if(!r.ok)throw new Error('http');return r.json()}).then(function(j){
    var seen={};
    return (j.products||[]).map(function(p){
      var n=p.nutriments||{},kcal=Number(n['energy-kcal_100g']);
      if(!p.product_name||!(kcal>0)||kcal>950)return null;
      var brand=p.brands?String(p.brands).split(',')[0].trim():'',name=(p.product_name+(brand?' ('+brand+')':'')).slice(0,80);
      if(seen[name])return null;seen[name]=1;
      return {name:name,serving:'100 g',cal:Math.round(kcal),p:r1(n.proteins_100g||0),c:r1(n.carbohydrates_100g||0),f:r1(n.fat_100g||0),k:'g',a:100};
    }).filter(Boolean).slice(0,12);
  });
}
function aiAvailable(){return !!(CFG.geminiKey&&!/^PASTE/i.test(CFG.geminiKey))}
async function aiEstimate(text){
  var model=CFG.geminiModel||'gemini-2.5-flash';
  var prompt='Estimate the nutrition of this food or meal: "'+text.replace(/"/g,"'")+'"\nIf it is several foods, split it into separate items. Where no portion is given, assume one typical home portion and say which in "serving". Reply with only a JSON array. Each item is {"name": string, "serving": string, "calories": number, "protein": number, "carbs": number, "fat": number} where the numbers describe that whole serving and macros are grams. Example: [{"name":"Boiled egg","serving":"2 large","calories":156,"protein":12.6,"carbs":1.2,"fat":10.6}]';
  var r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+encodeURIComponent(CFG.geminiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.2}})});
  if(!r.ok){var er=new Error('http');er.status=r.status;throw er}
  var j=await r.json(),t=j.candidates[0].content.parts.map(function(p){return p.text||''}).join('');
  var arr=JSON.parse(t.replace(/^```(?:json)?|```$/g,'').trim());
  if(!Array.isArray(arr))throw new Error('shape');return arr;
}

/* add-food sheet */
function openAddFood(date,meal){
  var A={mode:'search',meal:meal||defaultFMeal(),q:'',sel:null,est:[],estText:'',refreshAdd:null},closeFn=null;
  var chips=h('div',{class:'chips scroll'});
  function drawChips(){chips.replaceChildren();FMEALS.forEach(function(m){chips.append(h('button',{class:'chip',type:'button','aria-pressed':A.meal===m[0]?'true':'false',onclick:function(){A.meal=m[0];drawChips();if(A.refreshAdd)A.refreshAdd()}},m[2]+' '+m[1]))})}
  drawChips();
  var pane=h('div',{class:'form'});
  function commit(entries){addEntries(date,entries);closeFn.close();toast(entries.length===1?'Added '+entries[0].name:'Added '+entries.length+' items')}
  function drawPane(){pane.replaceChildren();A.refreshAdd=null;({search:drawSearch,detail:drawDetail,packaged:drawPackaged,ai:drawAI,custom:drawCustom})[A.mode]()}
  function back(){return h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){A.mode='search';drawPane()}},'‹ Back to search')}
  function rememberBox(label){var cb=h('input',{type:'checkbox'});cb.checked=true;return {row:h('label',{class:'togrow'},h('span',{text:label}),cb),box:cb}}
  function choose(f){A.sel=f;A.mode='detail';drawPane()}
  function resultRow(f,top,per){return h('li',null,h('button',{class:'result'+(top?' top':''),type:'button',onclick:function(){choose(f)}},h('span',null,h('b',{text:f.name}),f.mine?h('em',{class:'pill-tag'},'Mine'):null,h('span',{class:'sv',text:f.serving})),h('span',{class:'num',style:{textAlign:'right',fontWeight:'800'}},fmt(f.cal),h('small',{class:'muted',style:{display:'block',fontSize:'.68rem'},text:per||'kcal'}))))}
  function drawSearch(){
    var input=h('input',{id:'q',type:'search',placeholder:'Search food: ava, chicken, dal…','aria-label':'What did you eat?',autocomplete:'off',value:A.q});
    var acts=h('div',{class:'form'}),list=h('ul',{class:'results'}),topFood=null;
    function fill(){
      var q=A.q.trim(),toks=q.toLowerCase().split(/\s+/).filter(Boolean),all=allFoods();topFood=null;list.replaceChildren();acts.replaceChildren();
      if(toks.length){
        var hits=all.map(function(f){return {f:f,s:scoreFood(f,toks)}}).filter(function(x){return x.s>0}).sort(function(a,b){return b.s-a.s}).slice(0,30).map(function(x){return x.f});
        if(hits.length)topFood=hits[0];
        if(!hits.length)list.append(h('li',{class:'muted',style:{padding:'12px 4px'},text:'Nothing in your list matches “'+q.slice(0,40)+'”. Try the options below.'}));
        hits.forEach(function(f,i){list.append(resultRow(f,i===0))});
        if(q.length>=2){
          if(aiAvailable())acts.append(h('button',{class:'btn primary wide',type:'button',onclick:function(){A.estText=q;A.mode='ai';drawPane()}},'✨ Ask AI to estimate “'+q.slice(0,30)+'”'));
          acts.append(h('button',{class:'btn wide',type:'button',onclick:function(){A.estText=q;A.mode='packaged';drawPane()}},'🛒 Search packaged foods'));
          acts.append(h('button',{class:'btn ghost wide',type:'button',onclick:function(){A.mode='custom';drawPane()}},'✏️ Enter my own calories'));
        }
      }else{
        var rec=recentFoods();
        if(rec.length){list.append(h('li',{class:'grp',text:'Recent'}));rec.forEach(function(f){list.append(resultRow(f,false))})}
        list.append(h('li',{class:'grp',text:rec.length?'All foods':'Foods'}));all.slice(0,40).forEach(function(f){list.append(resultRow(f,false))});
        acts.append(h('div',{class:'muted small',text:'Start typing and matches appear. Press Enter to pick the top one. Not listed? Ask AI, search packaged foods, or enter your own.'}));
      }
    }
    input.addEventListener('input',function(){A.q=input.value;fill()});
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();if(topFood)choose(topFood)}});
    pane.append(input,list,acts);fill();
  }
  function drawDetail(){
    var f=A.sel,base=f.cal,uo=unitsFor(f),U=uo[0];
    var calIn=h('input',{id:'dCal',type:'number',inputmode:'numeric',min:'0',max:'5000',value:Math.round(f.cal)});
    var rem=rememberBox('Remember my number for next time');
    var qIn=h('input',{id:'dQty',type:'number',inputmode:'decimal',min:'0',step:'any',value:'1','aria-label':'How much'});
    var uSel=h('select',{id:'dUnit','aria-label':'Unit'},uo.map(function(u){return h('option',{value:u.u,text:u.u==='serving'?'serving ('+f.serving+')':u.label})}));
    var kc=h('div',{class:'bigcal num'}),mc=h('div',{class:'muted small'}),msg=h('div',{class:'small',style:{color:'var(--over)'},'aria-live':'polite'}),addBtn=h('button',{class:'btn primary wide',type:'button'});
    function servings(){return num(qIn.value,100000)/U.per}
    function cur(){var v=num(calIn.value,5000),k=base>0?v/base:1;return {name:f.name,serving:f.serving,cal:v,p:(f.p||0)*k,c:(f.c||0)*k,f:(f.f||0)*k,k:f.k,a:f.a,w:f.w}}
    function upd(){var x=cur(),s=servings();kc.textContent=fmt(x.cal*s)+' kcal';mc.textContent='Protein '+r1(x.p*s)+' g · Carbs '+r1(x.c*s)+' g · Fat '+r1(x.f*s)+' g';rem.row.hidden=Math.round(x.cal)===Math.round(base)}
    uSel.addEventListener('change',function(){var s=servings();U=uo.filter(function(u){return u.u===uSel.value})[0]||uo[0];qIn.value=String(r1(s*U.per));upd()});
    qIn.addEventListener('input',upd);calIn.addEventListener('input',upd);
    A.refreshAdd=function(){addBtn.textContent='Add to '+FMEAL_NAME[A.meal]};
    addBtn.addEventListener('click',function(){
      var x=cur(),s=servings();
      if(!(x.cal>0)){msg.textContent='Enter the calories as a number, such as 250.';calIn.focus();return}
      if(!(s>0)){msg.textContent='Enter how much you had.';qIn.focus();return}
      if(Math.round(x.cal)!==Math.round(base)&&rem.box.checked)rememberFood(x);
      commit([entryFrom(x,s,A.meal,U.u==='serving'?'':fmtQty(num(qIn.value,100000))+' '+UNIT_SHORT[U.u])]);
    });
    var minus=h('button',{class:'ibtn plain',type:'button','aria-label':'Less',onclick:function(){qIn.value=String(Math.max(U.step,r1(num(qIn.value)-U.step)));upd()}},'−');
    var plus=h('button',{class:'ibtn plain',type:'button','aria-label':'More',onclick:function(){qIn.value=String(r1(num(qIn.value)+U.step));upd()}},'+');
    pane.append(back(),h('div',null,h('h2',{text:f.name}),h('div',{class:'muted small',text:'1 serving = '+f.serving})),
      h('div',{class:'qtyrow'},minus,h('div',{class:'field'},h('label',{for:'dQty',text:'How much'}),qIn),h('div',{class:'field'},h('label',{for:'dUnit',text:'Unit'}),uSel),plus),
      kc,mc,h('div',{class:'field'},h('label',{for:'dCal',text:'Calories per serving (change if yours differs)'}),calIn),rem.row,msg,addBtn,
      f.mine?h('button',{class:'btn link danger',type:'button',style:{alignSelf:'flex-start'},onclick:function(){ucol(S.uid,'foods').del(f.id);A.mode='search';drawPane();toast('Removed from My foods')}},'Delete from My foods'):null);
    upd();A.refreshAdd();
  }
  function drawPackaged(){
    var status=h('div',{class:'muted small','aria-live':'polite'},h('span',{class:'spin'}),'Searching packaged foods…'),list=h('ul',{class:'results'});
    pane.append(back(),h('h2',{text:'Packaged foods: “'+A.estText.slice(0,40)+'”'}),status,list,h('button',{class:'btn ghost wide',type:'button',onclick:function(){A.mode='custom';drawPane()}},'✏️ Enter my own calories'));
    searchPackaged(A.estText).then(function(items){
      if(A.mode!=='packaged')return;
      if(!items.length){status.textContent='No packaged foods found.'+(aiAvailable()?' Try asking AI.':'');return}
      status.textContent='Calories shown per 100 g. Pick one, then enter how much you had.';items.forEach(function(f){list.append(resultRow(f,false,'per 100 g'))});
    }).catch(function(){if(A.mode==='packaged')status.textContent='Could not search right now. Check your internet connection.'});
  }
  function drawAI(){
    A.est=[];
    var status=h('div',{class:'muted small','aria-live':'polite'}),out=h('div',{class:'list'});
    var rem=rememberBox('Remember these foods for next time'),addBtn=h('button',{class:'btn primary wide',type:'button'}),retry=h('button',{class:'btn wide',type:'button',hidden:true},'Try again');
    function refresh(){var n=A.est.filter(function(x){return x.cal>0}).length,tot=sum(A.est,function(x){return x.cal});addBtn.hidden=rem.row.hidden=!A.est.length;addBtn.textContent='Add to '+FMEAL_NAME[A.meal]+' · '+fmt(tot)+' kcal';addBtn.disabled=!n}
    A.refreshAdd=refresh;
    function rows(){
      out.replaceChildren();
      A.est.forEach(function(it,i){
        var ci=h('input',{type:'number',inputmode:'numeric',min:'0',max:'5000',value:it.cal,'aria-label':'Calories for '+it.name,style:{width:'6.5rem',textAlign:'right',fontWeight:'700'}});
        ci.addEventListener('input',function(){var nv=num(ci.value,5000),b=it.base,k=b.cal>0?nv/b.cal:1;it.cal=nv;it.p=b.p*k;it.c=b.c*k;it.f=b.f*k;refresh()});
        out.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:it.name}),h('small',{text:it.serving})),ci,h('button',{class:'ibtn plain',type:'button','aria-label':'Skip '+it.name,onclick:function(){A.est.splice(i,1);rows()}},'×')));
      });refresh();
    }
    async function run(){
      A.est=[];rows();retry.hidden=true;status.replaceChildren(h('span',{class:'spin'}),'Estimating “'+A.estText.slice(0,40)+'”…');
      try{
        var items=await aiEstimate(A.estText);if(A.mode!=='ai')return;
        A.est=items.slice(0,12).map(function(x){var it={name:String(x.name||'Food').slice(0,80),serving:String(x.serving||'1 serving').slice(0,40),cal:Math.round(num(x.calories,5000)),p:num(x.protein,2000),c:num(x.carbs,2000),f:num(x.fat,2000)};it.base={cal:it.cal,p:it.p,c:it.c,f:it.f};return it}).filter(function(x){return x.cal>0});
        status.textContent=A.est.length?'AI estimate. Change any number that looks wrong, or remove an item.':'No foods found. Try different words, or enter your own calories.';rows();
      }catch(e){
        var st=e&&e.status;status.textContent=st===429?'The free AI limit was reached for now. Try again later, or use packaged search or your own calories.':(st===400||st===403)?'The AI key is not working. Check the setup steps.':'The AI estimate did not work. Check your connection and try again.';
        if(st!==400&&st!==403)retry.hidden=false;
      }
    }
    retry.addEventListener('click',run);
    addBtn.addEventListener('click',function(){var items=A.est.filter(function(x){return x.cal>0});if(!items.length)return;if(rem.box.checked)items.forEach(rememberFood);commit(items.map(function(it){return entryFrom(it,1,A.meal)}))});
    pane.append(back(),status,out,retry,rem.row,addBtn);refresh();run();
  }
  function drawCustom(){
    function fld(id,label,attrs){var i=h('input',Object.assign({id:id},attrs));return {i:i,w:h('div',{class:'field'},h('label',{for:id,text:label}),i)}}
    var nm=fld('cuName','Food name',{type:'text',placeholder:'Example: Mom’s vegetable curry',maxlength:'80',value:A.q.trim().slice(0,80)});
    var ca=fld('cuCal','Calories',{type:'number',inputmode:'numeric',min:'0',max:'5000',placeholder:'0'});
    var amt=fld('cuAmt','For this amount',{type:'number',inputmode:'decimal',min:'0',step:'any',value:'1'});
    var unit=h('select',{id:'cuUnit','aria-label':'Unit'},h('option',{value:'serving',text:'serving'}),h('option',{value:'g',text:'grams (g)'}),h('option',{value:'ml',text:'millilitres (ml)'}),h('option',{value:'pc',text:'pieces'}));
    var sv=fld('cuServ','Serving name (optional)',{type:'text',maxlength:'40',placeholder:'1 bowl, 1 plate…'});
    var pr=fld('cuP','Protein g',{type:'number',inputmode:'decimal',min:'0',placeholder:'0'}),cb=fld('cuC','Carbs g',{type:'number',inputmode:'decimal',min:'0',placeholder:'0'}),ft=fld('cuF','Fat g',{type:'number',inputmode:'decimal',min:'0',placeholder:'0'});
    var rem=rememberBox('Remember this food for next time'),msg=h('div',{class:'small',style:{color:'var(--over)'},'aria-live':'polite'}),addBtn=h('button',{class:'btn primary wide',type:'submit'}),hintU=h('div',{class:'muted small'});
    function hint(){hintU.textContent=unit.value==='serving'?'Example: 250 calories for 1 serving.':'Example: 130 calories for 100 '+({g:'g',ml:'ml',pc:'pieces'}[unit.value])+'. Then you can log any amount later.'}
    A.refreshAdd=function(){addBtn.textContent=unit.value==='serving'?'Add to '+FMEAL_NAME[A.meal]:'Save, then choose how much'};
    unit.addEventListener('change',function(){hint();A.refreshAdd()});hint();
    var form=h('form',{class:'form',onsubmit:function(ev){
      ev.preventDefault();
      var cal=num(ca.i.value,5000),a=num(amt.i.value,100000),u=unit.value;
      if(!(cal>0)){msg.textContent='Enter the calories as a number, such as 250.';ca.i.focus();return}
      if(u!=='serving'&&!(a>0)){msg.textContent='Enter the amount the calories are for.';amt.i.focus();return}
      var label=u==='serving'?(sv.i.value.trim()||'1 serving'):(sv.i.value.trim()||fmtQty(a)+' '+UNIT_SHORT[u]);
      var food={name:nm.i.value.trim()||'My food',serving:label,cal:cal,p:num(pr.i.value,2000),c:num(cb.i.value,2000),f:num(ft.i.value,2000)};
      if(u!=='serving'){food.k=u;food.a=a}
      if(rem.box.checked||u!=='serving')rememberFood(food);
      if(u!=='serving'){A.sel=food;A.mode='detail';drawPane();toast('Saved. Now choose how much you had.');return}
      commit([entryFrom(food,1,A.meal)]);
    }},nm.w,h('div',{class:'f2'},ca.w,h('div',{class:'field'},h('label',{for:'cuUnit',text:'Per'}),unit)),amt.w,hintU,sv.w,h('div',{class:'f2',style:{gridTemplateColumns:'repeat(3,1fr)'}},pr.w,cb.w,ft.w),h('div',{class:'muted small',text:'Protein, carbs and fat are optional.'}),rem.row,msg,addBtn);
    pane.append(back(),form);A.refreshAdd();(nm.i.value?ca.i:nm.i).focus();
  }
  drawPane();
  closeFn=openSheet('Add food',h('div',{class:'form'},chips,pane));
}

function goalSheet(){
  var m=me(),gIn=h('input',{id:'goalIn',type:'number',inputmode:'numeric',min:'800',max:'6000',value:m.goal||2000}),gmsg=h('div',{class:'small',style:{color:'var(--over)'},'aria-live':'polite'});
  function fld(id,label,attrs){var i=h('input',Object.assign({id:id},attrs));return {i:i,w:h('div',{class:'field'},h('label',{for:id,text:label}),i)}}
  var age=fld('cAge','Age',{type:'number',inputmode:'numeric',min:'18',max:'110'}),ft=fld('cFt','Height, feet',{type:'number',inputmode:'numeric',min:'3',max:'8'}),inch=fld('cIn','Inches',{type:'number',inputmode:'numeric',min:'0',max:'11',value:'0'}),wt=fld('cWt','Weight, pounds',{type:'number',inputmode:'decimal',min:'60',max:'700'});
  var sex=h('select',{id:'cSex'},h('option',{value:'f',text:'Female'}),h('option',{value:'m',text:'Male'}));
  var act=h('select',{id:'cAct'},h('option',{value:'1.2',text:'Mostly sitting'}),h('option',{value:'1.375',text:'Light activity',selected:true}),h('option',{value:'1.55',text:'Active, exercise most days'}),h('option',{value:'1.725',text:'Very active or physical job'}));
  var aim=h('select',{id:'cAim'},h('option',{value:'0',text:'Stay at my weight'}),h('option',{value:'-250',text:'Lose about 0.5 lb a week'}),h('option',{value:'-500',text:'Lose about 1 lb a week'}),h('option',{value:'250',text:'Gain about 0.5 lb a week'}));
  var res=h('div',{class:'form','aria-live':'polite'}),el;
  function save(v){v=Math.round(Number(v));if(!(v>=800&&v<=6000)){gmsg.textContent='Enter a goal between 800 and 6,000 calories.';return false}saveMe({goal:v,goalSet:true});return true}
  var calc=h('button',{class:'btn wide',type:'button',onclick:function(){
    var a=Number(age.i.value),H=Number(ft.i.value)*12+Number(inch.i.value||0),W=Number(wt.i.value);res.replaceChildren();
    if(!(a>=18&&H>=36&&W>=60)){res.append(h('div',{class:'muted small',text:'Fill in age, height and weight to see a suggestion.'}));return}
    var bmr=10*W*0.45359237+6.25*H*2.54-5*a+(sex.value==='m'?5:-161),maint=bmr*Number(act.value),target=Math.max(1200,Math.round((maint+Number(aim.value))/10)*10);
    res.append(h('div',null,h('span',{class:'label',text:'Suggested goal'}),h('div',{class:'bigcal num',text:fmt(target)+' kcal'})),h('div',{class:'muted small',text:'Staying the same weight takes about '+fmt(maint)+' a day.'}),
      h('button',{class:'btn primary wide',type:'button',onclick:function(){if(save(target)){el.close();toast('Goal set to '+fmt(target))}}},'Use this goal'),
      h('div',{class:'muted small',text:'This is an estimate. Please talk to a doctor or dietitian before cutting calories, especially if you are older or have a health condition.'}));
  }},'Work out a goal for me');
  el=openSheet('Daily calorie goal',h('div',{class:'form'},h('div',{class:'field'},h('label',{for:'goalIn',text:'My daily goal (calories)'}),gIn),gmsg,
    h('button',{class:'btn primary wide',type:'button',onclick:function(){if(save(gIn.value)){el.close();toast('Goal saved')}}},'Save goal'),
    h('details',{style:{background:'var(--soft)',borderRadius:'14px',padding:'0 14px'}},h('summary',{style:{minHeight:'48px',display:'flex',alignItems:'center',fontWeight:'700'}},'Help me choose a goal'),
      h('div',{class:'form',style:{paddingBottom:'14px'}},h('div',{class:'f2'},age.w,h('div',{class:'field'},h('label',{for:'cSex',text:'Sex'}),sex)),h('div',{class:'f2',style:{gridTemplateColumns:'repeat(3,1fr)'}},ft.w,inch.w,wt.w),h('div',{class:'field'},h('label',{for:'cAct',text:'Activity'}),act),h('div',{class:'field'},h('label',{for:'cAim',text:'Aim'}),aim),calc,res))));
}

function pageFood(el,param){
  var date=today(),view=param&&param!=='me'&&S.members[param]?param:S.uid,tab='day';
  var seg=segControl([['day','Day'],['week','Week'],['fam','Family']],tab,function(v){tab=v;upd()});
  var body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  var banner=h('div',{class:'card',style:{background:'var(--ink)',color:'var(--bg)'},hidden:true});
  el.append(pageHead('Calories',null,[h('button',{class:'btn sm',type:'button',onclick:goalSheet},'🎯 Goal')]),seg,banner,body,fab('Add food',function(){openAddFood(date)}));
  function ro(){return view!==S.uid}
  function dateBar(){
    return h('div',{class:'card',style:{padding:'8px',flexDirection:'row',alignItems:'center'}},
      h('button',{class:'ibtn plain',type:'button','aria-label':'Previous day',onclick:function(){date=addDays(date,-1);upd()}},'‹'),
      h('div',{class:'grow',style:{textAlign:'center',fontWeight:'800'}},relDay(date),h('div',{class:'muted small',style:{fontWeight:'500'},text:dayLabel(date,true)})),
      h('button',{class:'ibtn plain',type:'button','aria-label':'Next day',disabled:date>=today(),onclick:function(){date=addDays(date,1);upd()}},'›'));
  }
  function dayView(){
    var entries=dayEntries(view,date),t=sumEntries(entries),goal=goalOf(view),left=goal-t.cal,over=left<0;
    body.append(dateBar());
    if(!ro()&&!me().goalSet)body.append(h('div',{class:'card',style:{flexDirection:'row',alignItems:'center'}},h('span',{class:'grow',text:'Set your daily calorie goal for better numbers.'}),h('button',{class:'btn primary sm',type:'button',onclick:goalSheet},'Set goal')));
    var tgt={p:goal*0.25/4,c:goal*0.5/4,f:goal*0.25/9},mac=h('div',{class:'macrow'});
    [['p','Protein',t.p,'var(--c-tasks)'],['c','Carbs',t.c,'var(--c-shop)'],['f','Fat',t.f,'var(--c-notes)']].forEach(function(x){var b=h('i');b.style.width=Math.min(100,x[2]/tgt[x[0]]*100)+'%';b.style.background=x[3];mac.append(h('div',null,h('div',{class:'row'},h('span',{text:x[1]}),h('b',{class:'right num',text:fmt(x[2])+' g'})),h('div',{class:'bar'},b)))});
    body.append(h('section',{class:'card'},h('div',{class:'row'},donut([{v:Math.min(t.cal,goal),color:over?'var(--over)':'var(--c-food)'}],goal,fmt(Math.abs(left)),over?'over':'left'),
      h('div',{class:'grow'},h('div',{class:'num',style:{fontSize:'1.5rem',fontWeight:'800'},text:fmt(t.cal)}),h('div',{class:'muted small',text:'eaten of '+fmt(goal)}))),mac));
    var yest=ucol(view,'days').get(addDays(date,-1));
    FMEALS.forEach(function(m){
      var list=entries.filter(function(e){return e.meal===m[0]}),sub=sum(list,function(e){return e.cal||0});
      var c=h('section',{class:'card'}),l=h('div',{class:'list'});
      c.append(h('div',{class:'row'},h('span',{class:'avatar',text:m[2]}),h('div',{class:'grow'},h('b',{text:m[1]}),h('div',{class:'muted small num',text:sub?fmt(sub)+' kcal':'Nothing yet'})),ro()?null:h('button',{class:'ibtn brand',type:'button','aria-label':'Add to '+m[1],onclick:function(){openAddFood(date,m[0])}},'+')));
      list.forEach(function(e){
        var detail=e.disp?e.disp:((e.serving||'')+(e.qty&&e.qty!==1?' × '+fmtQty(e.qty):'')),macros=(e.p||e.c||e.f)?'P '+r1(e.p||0)+' · C '+r1(e.c||0)+' · F '+r1(e.f||0):'';
        l.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:e.name}),h('small',{text:[detail,macros].filter(Boolean).join('  ·  ')})),h('b',{class:'num',text:fmt(e.cal||0)}),ro()?null:h('button',{class:'ibtn plain',type:'button','aria-label':'Remove '+e.name,onclick:function(){removeEntry(date,e.id)}},'×')));
      });
      if(list.length)c.append(l);
      if(!ro()&&!list.length&&yest&&yest.entries.some(function(e){return e.meal===m[0]}))c.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){addEntries(date,yest.entries.filter(function(e){return e.meal===m[0]}).map(function(e){return Object.assign({},e,{id:newId()})}))}},'Copy yesterday’s '+m[1].toLowerCase()));
      body.append(c);
    });
  }
  function weekView(){
    var days=[],i;for(i=6;i>=0;i--)days.push(addDays(today(),-i));
    var goal=goalOf(view),vals=days.map(function(d){return Math.round(sumEntries(dayEntries(view,d)).cal)}),logged=vals.filter(function(v){return v>0});
    var NS='http://www.w3.org/2000/svg';function se(t,a,x){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(x!=null)e.textContent=x;return e}
    var svg=se('svg',{viewBox:'0 0 336 160',role:'img','aria-label':'Calories eaten each of the last seven days compared with the daily goal'});
    var max=Math.max(goal*1.3,Math.max.apply(null,vals)*1.1,100),base=124,plot=100,gy=base-goal/max*plot;
    svg.append(se('line',{x1:6,x2:330,y1:gy,y2:gy,stroke:'var(--muted)','stroke-width':1.5,'stroke-dasharray':'4 4'}));
    days.forEach(function(d,idx){var v=vals[idx],x=14+idx*46,hh=v/max*plot;
      if(v>0){svg.append(se('rect',{x:x,y:base-hh,width:30,height:hh,rx:8,fill:v>goal?'var(--over)':'var(--c-food)'}));svg.append(se('text',{x:x+15,y:base-hh-5,'text-anchor':'middle','font-size':10},fmt(v)))}
      else svg.append(se('rect',{x:x,y:base-3,width:30,height:3,rx:1.5,fill:'var(--line)'}));
      svg.append(se('text',{x:x+15,y:base+16,'text-anchor':'middle','font-size':10},parseD(d).toLocaleDateString('en-US',{weekday:'short'}).slice(0,3)))});
    var avg=logged.length?sum(logged)/logged.length:0;
    body.append(h('section',{class:'card week'},h('h2',{text:'Last 7 days'}),svg,h('div',{class:'muted small',text:'Dashed line is the daily goal. Red bars went over it.'})),
      h('div',{class:'kpis'},h('div',{class:'kpi'},h('b',{class:'num',text:logged.length?fmt(avg):'–'}),h('span',{text:'Average a day'})),h('div',{class:'kpi'},h('b',{class:'num',text:logged.length+'/7'}),h('span',{text:'Days logged'})),h('div',{class:'kpi'},h('b',{class:'num',text:fmt(goal)}),h('span',{text:'Goal'}))));
  }
  function famView(){
    var ids=memberList().map(function(m){return m.id});
    if(!ids.length)ids=[S.uid];
    ids.forEach(function(id){
      var s=foodSummary(id,today()),left=s.goal-s.cal,pb=h('i');pb.style.width=Math.min(100,s.cal/s.goal*100)+'%';if(left<0)pb.className='over';
      body.append(h('section',{class:'card'},h('div',{class:'row'},avatar(id,'lg'),h('div',{class:'grow'},h('b',{text:nameOf(id)+(id===S.uid?' (you)':'')}),h('div',{class:'muted small',text:'Goal '+fmt(s.goal)+' a day'}))),h('div',{class:'bar'},pb),
        h('div',{class:'row'},h('span',null,h('b',{class:'num',text:fmt(s.cal)}),' eaten · ',h('span',{class:'num',style:left<0?{color:'var(--over)'}:{},text:left<0?fmt(-left)+' over':fmt(left)+' left'})),
          h('button',{class:'btn sm right',type:'button',onclick:function(){view=id;tab='day';date=today();seg.replaceWith(seg=segControl([['day','Day'],['week','Week'],['fam','Family']],'day',function(v){tab=v;upd()}));upd()}},id===S.uid?'My log':'View log'))));
    });
    body.append(h('div',{class:'muted small',text:'Everyone in the family can see each other’s food logs. Each person can only change their own.'}));
  }
  function upd(){
    var active=document.activeElement;if(active&&active.tagName==='INPUT'&&body.contains(active))return;
    banner.hidden=!ro();
    if(ro()){banner.replaceChildren(h('div',{class:'row'},h('span',{class:'grow',text:'Viewing '+nameOf(view)+'’s log (read only)'}),h('button',{class:'btn sm',type:'button',style:{background:'var(--bg)',color:'var(--ink)'},onclick:function(){view=S.uid;upd()}},'My log')))}
    $('.fab',el)&&($('.fab',el).hidden=ro()||tab==='fam');
    body.replaceChildren();
    ({day:dayView,week:weekView,fam:famView})[tab]();
  }
  return upd;
}
