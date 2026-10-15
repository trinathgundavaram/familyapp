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
function addEntries(date,entries,uid){
  var c=ucol(uid||S.uid,'days'),d=c.get(date)||{id:date,date:date,entries:[]};
  c.save(Object.assign({},d,{id:date,date:date,entries:d.entries.concat(entries)}));
}
function removeEntry(date,id,uid){
  var c=ucol(uid||S.uid,'days'),d=c.get(date);if(!d)return;
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
// Key comes from the family settings (owner sets it; only family can read it), else app-config.js.
function aiKey(){var k=S.fam.geminiKey||CFG.geminiKey||'';return /^PASTE/i.test(k)?'':k}
function aiAvailable(){return !!aiKey()}
async function aiEstimate(text){
  var model=CFG.geminiModel||'gemini-3.8-flash';
  var prompt='Estimate the nutrition of this food or meal: "'+text.replace(/"/g,"'")+'"\nIf it is several foods, split it into separate items. Where no portion is given, assume one typical home portion and say which in "serving". Reply with only a JSON array. Each item is {"name": string, "serving": string, "calories": number, "protein": number, "carbs": number, "fat": number} where the numbers describe that whole serving and macros are grams. Example: [{"name":"Boiled egg","serving":"2 large","calories":156,"protein":12.6,"carbs":1.2,"fat":10.6}]';
  var r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':aiKey()},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.2}})});
  if(!r.ok){var er=new Error('http');er.status=r.status;throw er}
  var j=await r.json(),t=j.candidates[0].content.parts.map(function(p){return p.text||''}).join('');
  var arr=JSON.parse(t.replace(/^```(?:json)?|```$/g,'').trim());
  if(!Array.isArray(arr))throw new Error('shape');return arr;
}

/* add-food sheet */
function openAddFood(date,meal,uid){
  var A={mode:'search',meal:meal||defaultFMeal(),q:'',sel:null,est:[],estText:'',refreshAdd:null},closeFn=null;
  var chips=h('div',{class:'chips scroll'});
  function drawChips(){chips.replaceChildren();FMEALS.forEach(function(m){chips.append(h('button',{class:'chip',type:'button','aria-pressed':A.meal===m[0]?'true':'false',onclick:function(){A.meal=m[0];drawChips();if(A.refreshAdd)A.refreshAdd()}},m[2]+' '+m[1]))})}
  drawChips();
  var pane=h('div',{class:'form'});
  function commit(entries){addEntries(date,entries,uid);closeFn.close();toast(entries.length===1?'Added '+entries[0].name:'Added '+entries.length+' items')}
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
        var st=e&&e.status;status.textContent=st===429?'The free AI limit was reached for now. Try again later, or use packaged search or your own calories.':(st===500||st===503)?'The AI is busy right now. Wait a minute and tap Try again.':(st===400||st===401||st===403)?'The AI key is not working. The family owner can paste a new one in Family & settings.':st===404?'This AI model was retired. Update geminiModel in app-config.js.':'The AI estimate did not work. Check your connection and try again.';
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

/* ---- nutrition targets: calories (Mifflin-St Jeor) + protein / carbs / fat ---- */
var ACTS=[['1.2','Mostly sitting'],['1.375','Light activity (1–3 days a week)'],['1.55','Active (exercise most days)'],['1.725','Very active or physical job']];
var AIMS=[['0','Stay at my weight'],['-250','Lose about 0.5 lb a week'],['-500','Lose about 1 lb a week'],['250','Gain about 0.5 lb a week']];
function calcPlan(b){
  var a=Number(b.age),H=(Number(b.ft)||0)*12+(Number(b.inch)||0),W=Number(b.lb);
  if(!(a>=13&&a<=110&&H>=48&&H<=96&&W>=60&&W<=700))return null;
  var kg=W*0.45359237,cm=H*2.54,act=Number(b.act)||1.375,aim=a<18?0:Number(b.aim)||0;
  var bmr=10*kg+6.25*cm-5*a+(b.sex==='m'?5:-161),maint=bmr*act;
  var cal=Math.max(a<18?1600:1200,Math.round((maint+aim)/10)*10);
  var pf={'1.2':1.0,'1.375':1.2,'1.55':1.4,'1.725':1.6}[String(act)]||1.2;if(aim<0)pf+=0.2;
  var p=Math.min(kg*pf,cal*0.35/4),f=cal*0.30/9,c=Math.max(0,(cal-p*4-f*9)/4);
  return {cal:cal,maint:Math.round(maint),p:Math.round(p),c:Math.round(c),f:Math.round(f),teen:a<18,pf:pf};
}
// Targets for a person: saved plan, else split their calorie goal 20% protein / 50% carbs / 30% fat.
function macroTargets(uid){
  var m=S.members[uid]||{},g=goalOf(uid),t=m.macros||{};
  return {cal:g,p:t.p>0?t.p:Math.round(g*0.20/4),c:t.c>0?t.c:Math.round(g*0.50/4),f:t.f>0?t.f:Math.round(g*0.30/9),set:!!(t.p>0)};
}
function goalSheet(uid){
  uid=uid||S.uid;var m=S.members[uid]||{},b=m.body||{},isMe=uid===S.uid,who=isMe?'your':nameOf(uid)+'’s',el;
  function fld(id,label,attrs,val){var i=h('input',Object.assign({id:id},attrs));if(val!=null&&val!=='')i.value=val;return {i:i,w:h('div',{class:'field'},h('label',{for:id,text:label}),i)}}
  function sel(id,label,opts,val){var s=h('select',{id:id},opts.map(function(o){return h('option',{value:o[0],text:o[1]})}));if(val!=null)s.value=String(val);return {i:s,w:h('div',{class:'field'},h('label',{for:id,text:label}),s)}}
  var age=fld('nAge','Age',{type:'number',inputmode:'numeric',min:'13',max:'110'},b.age),
      sex=sel('nSex','Sex',[['f','Female'],['m','Male']],b.sex||'f'),
      ft=fld('nFt','Height, feet',{type:'number',inputmode:'numeric',min:'4',max:'8'},b.ft),
      inch=fld('nIn','Inches',{type:'number',inputmode:'numeric',min:'0',max:'11'},b.inch==null?'0':b.inch),
      wt=fld('nWt','Weight, pounds',{type:'number',inputmode:'decimal',min:'60',max:'700'},b.lb),
      act=sel('nAct','Activity',ACTS,b.act||'1.375'),
      aim=sel('nAim','Aim',AIMS,b.aim||'0');
  var res=h('div',{class:'plan','aria-live':'polite'});
  function stats(){return {age:age.i.value,sex:sex.i.value,ft:ft.i.value,inch:inch.i.value,lb:wt.i.value,act:act.i.value,aim:aim.i.value}}
  function draw(){
    var bb=stats(),pl=calcPlan(bb);res.replaceChildren();
    if(Number(bb.age)>0&&Number(bb.age)<13){res.append(h('div',{class:'muted small',text:'For children under 13, please ask your pediatrician for targets and enter them under “Set my own numbers”.'}));return}
    if(!pl){res.append(h('div',{class:'muted small',text:'Fill in age, height and weight to see '+who+' daily targets.'}));return}
    res.append(
      h('div',{class:'plangrid'},
        h('div',{class:'pcell cal'},h('span',{text:'Calories'}),h('b',{class:'num',text:fmt(pl.cal)}),h('small',{text:'kcal a day'})),
        h('div',{class:'pcell'},h('span',{text:'Protein'}),h('b',{class:'num',text:pl.p+' g'}),h('small',{text:Math.round(pl.p*4/pl.cal*100)+'%'})),
        h('div',{class:'pcell'},h('span',{text:'Carbs'}),h('b',{class:'num',text:pl.c+' g'}),h('small',{text:Math.round(pl.c*4/pl.cal*100)+'%'})),
        h('div',{class:'pcell'},h('span',{text:'Fat'}),h('b',{class:'num',text:pl.f+' g'}),h('small',{text:Math.round(pl.f*9/pl.cal*100)+'%'}))),
      h('div',{class:'muted small',text:'Staying the same weight takes about '+fmt(pl.maint)+' kcal a day. Protein is '+pl.pf.toFixed(1)+' g per kg of body weight, fat is 30% of calories and carbs make up the rest.'+(pl.teen?' Teen targets keep weight steady; ask a doctor before any diet.':'')}),
      h('button',{class:'btn primary wide',type:'button',onclick:function(){
        savePerson(uid,{body:bb,goal:pl.cal,goalSet:true,macros:{p:pl.p,c:pl.c,f:pl.f},plan:'auto'});el.close();toast('Saved '+(isMe?'your':nameOf(uid)+'’s')+' daily targets')}},'Save these targets'));
  }
  [age,ft,inch,wt].forEach(function(x){x.i.addEventListener('input',draw)});[sex,act,aim].forEach(function(x){x.i.addEventListener('change',draw)});
  var cur=macroTargets(uid);
  var mc=fld('mCal','Calories',{type:'number',inputmode:'numeric',min:'800',max:'6000'},m.goal||2000),
      mp=fld('mP','Protein (g)',{type:'number',inputmode:'numeric',min:'0',max:'400'},cur.p),
      mcb=fld('mC','Carbs (g)',{type:'number',inputmode:'numeric',min:'0',max:'800'},cur.c),
      mf=fld('mF','Fat (g)',{type:'number',inputmode:'numeric',min:'0',max:'300'},cur.f),
      mmsg=h('div',{class:'small',style:{color:'var(--over)'},'aria-live':'polite'});
  el=openSheet((isMe?'My':nameOf(uid)+'’s')+' daily targets',h('div',{class:'form'},
    h('div',{class:'f2'},age.w,sex.w),h('div',{class:'f2',style:{gridTemplateColumns:'1fr 1fr 1.3fr'}},ft.w,inch.w,wt.w),act.w,aim.w,res,
    h('details',{class:'manual'},h('summary',null,'Set my own numbers'),
      h('div',{class:'form',style:{paddingTop:'12px'}},h('div',{class:'muted small',text:'Use this if a doctor or dietitian gave you targets.'}),mc.w,h('div',{class:'f2',style:{gridTemplateColumns:'1fr 1fr 1fr'}},mp.w,mcb.w,mf.w),mmsg,
        h('button',{class:'btn wide',type:'button',onclick:function(){
          var v=Math.round(Number(mc.i.value));if(!(v>=800&&v<=6000)){mmsg.textContent='Enter calories between 800 and 6,000.';return}
          savePerson(uid,{goal:v,goalSet:true,macros:{p:Math.round(Number(mp.i.value))||0,c:Math.round(Number(mcb.i.value))||0,f:Math.round(Number(mf.i.value))||0},plan:'manual'});el.close();toast('Targets saved')}},'Save my numbers'))),
    h('div',{class:'muted small',text:'These are estimates for healthy adults. Please talk to a doctor or dietitian before cutting calories, especially if pregnant, older, or managing a health condition.'})));
  draw();
}
function macroBars(t,tg){
  var mac=h('div',{class:'macrow'});
  [['p','Protein','var(--c-tasks)'],['c','Carbs','var(--c-shop)'],['f','Fat','var(--c-notes)']].forEach(function(x){
    var v=t[x[0]]||0,g=tg[x[0]]||1,b=h('i');b.style.width=Math.min(100,v/g*100)+'%';b.style.background=v>g*1.1?'var(--over)':x[2];
    mac.append(h('div',null,h('div',{class:'mlab'},h('span',{text:x[1]}),h('span',{class:'num'},h('b',{text:fmt(v)}),' / '+fmt(g)+' g')),h('div',{class:'bar'},b)));
  });
  return mac;
}
function pageFood(el,param){
  var date=today(),view=param&&param!=='me'&&S.members[param]?param:S.uid,tab='day';
  var seg=segControl([['day','Day'],['week','Week'],['fam','Family']],tab,function(v){tab=v;upd()});
  var body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  var banner=h('div',{class:'card',style:{background:'var(--ink)',color:'var(--bg)'},hidden:true});
  el.append(pageHead('Calories',null,[h('button',{class:'btn sm',type:'button',onclick:function(){goalSheet(view)}},ico('target'),'Targets')]),seg,banner,body,fab('Add food',function(){openAddFood(date,null,view)}));
  function ro(){return false} // everyone in the family can edit any log
  function dateBar(){
    return h('div',{class:'card',style:{padding:'8px',flexDirection:'row',alignItems:'center'}},
      h('button',{class:'ibtn plain',type:'button','aria-label':'Previous day',onclick:function(){date=addDays(date,-1);upd()}},'‹'),
      h('div',{class:'grow',style:{textAlign:'center',fontWeight:'800'}},relDay(date),h('div',{class:'muted small',style:{fontWeight:'500'},text:dayLabel(date,true)})),
      h('button',{class:'ibtn plain',type:'button','aria-label':'Next day',disabled:date>=today(),onclick:function(){date=addDays(date,1);upd()}},'›'));
  }
  function dayView(){
    var entries=dayEntries(view,date),t=sumEntries(entries),goal=goalOf(view),left=goal-t.cal,over=left<0;
    body.append(dateBar());
    var vm=S.members[view]||{},tg=macroTargets(view);
    if(!(vm.macros&&vm.macros.p>0))body.append(h('div',{class:'card',style:{flexDirection:'row',alignItems:'center'}},h('span',{class:'grow',text:'Work out '+(view===S.uid?'your':nameOf(view)+'’s')+' calories, protein, carbs and fat from age, height and weight.'}),h('button',{class:'btn primary sm nowrap',type:'button',onclick:function(){goalSheet(view)}},'Set targets')));
    body.append(h('section',{class:'card'},h('div',{class:'row'},donut([{v:Math.min(t.cal,goal),color:over?'var(--over)':'var(--c-food)'}],goal,fmt(Math.abs(left)),over?'over':'left'),
      h('div',{class:'grow'},h('div',{class:'label',text:'Calories'}),h('div',{class:'num calfrac'},h('b',{text:fmt(t.cal)}),h('span',{text:' / '+fmt(goal)})),h('div',{class:'muted small',text:'consumed / required'}),
        h('button',{class:'btn sm',type:'button',style:{marginTop:'8px'},onclick:function(){goalSheet(view)}},ico('target'),'Targets'))),macroBars(t,tg)));
    var yest=ucol(view,'days').get(addDays(date,-1));
    FMEALS.forEach(function(m){
      var list=entries.filter(function(e){return e.meal===m[0]}),sub=sum(list,function(e){return e.cal||0});
      var c=h('section',{class:'card'}),l=h('div',{class:'list'});
      c.append(h('div',{class:'row'},h('span',{class:'avatar',text:m[2]}),h('div',{class:'grow'},h('b',{text:m[1]}),h('div',{class:'muted small num',text:sub?fmt(sub)+' kcal':'Nothing yet'})),ro()?null:h('button',{class:'ibtn brand',type:'button','aria-label':'Add to '+m[1],onclick:function(){openAddFood(date,m[0],view)}},'+')));
      list.forEach(function(e){
        var detail=e.disp?e.disp:((e.serving||'')+(e.qty&&e.qty!==1?' × '+fmtQty(e.qty):'')),macros=(e.p||e.c||e.f)?'P '+r1(e.p||0)+' · C '+r1(e.c||0)+' · F '+r1(e.f||0):'';
        l.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:e.name}),h('small',{text:[detail,macros].filter(Boolean).join('  ·  ')})),h('b',{class:'num',text:fmt(e.cal||0)}),ro()?null:h('button',{class:'ibtn plain',type:'button','aria-label':'Remove '+e.name,onclick:function(){removeEntry(date,e.id,view)}},'×')));
      });
      if(list.length)c.append(l);
      if(!ro()&&!list.length&&yest&&yest.entries.some(function(e){return e.meal===m[0]}))c.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){addEntries(date,yest.entries.filter(function(e){return e.meal===m[0]}).map(function(e){return Object.assign({},e,{id:newId()})}),view)}},'Copy yesterday’s '+m[1].toLowerCase()));
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
      var s=foodSummary(id,today()),left=s.goal-s.cal,pb=h('i'),tg=macroTargets(id);pb.style.width=Math.min(100,s.cal/s.goal*100)+'%';if(left<0)pb.className='over';
      body.append(h('section',{class:'card'},h('div',{class:'row'},avatar(id,'lg'),h('div',{class:'grow'},h('b',{text:nameOf(id)+(id===S.uid?' (you)':'')}),h('div',{class:'num calfrac sm'},h('b',{text:fmt(s.cal)}),h('span',{text:' / '+fmt(s.goal)+' kcal'}))),
          h('button',{class:'btn sm',type:'button',onclick:function(){goalSheet(id)}},'Targets')),h('div',{class:'bar'},pb),macroBars(s,tg),
        h('div',{class:'row'},h('span',{class:'num small',style:left<0?{color:'var(--over)'}:{},text:left<0?fmt(-left)+' kcal over':fmt(left)+' kcal left'}),
          h('button',{class:'btn sm right',type:'button',onclick:function(){view=id;tab='day';date=today();seg.replaceWith(seg=segControl([['day','Day'],['week','Week'],['fam','Family']],'day',function(v){tab=v;upd()}));upd()}},id===S.uid?'My log':'View log'))));
    });
    body.append(h('div',{class:'muted small',text:'Everyone in the family can see and update each other’s food logs and targets.'}));
  }
  function upd(){
    var active=document.activeElement;if(active&&active.tagName==='INPUT'&&body.contains(active))return;
    banner.hidden=view===S.uid;
    if(view!==S.uid){banner.replaceChildren(h('div',{class:'row'},h('span',{class:'grow',text:'Viewing '+nameOf(view)+'’s log. Changes are saved to their log.'}),h('button',{class:'btn sm',type:'button',style:{background:'var(--bg)',color:'var(--ink)'},onclick:function(){view=S.uid;upd()}},'My log')))}
    $('.fab',el)&&($('.fab',el).hidden=ro()||tab==='fam');
    body.replaceChildren();
    ({day:dayView,week:weekView,fam:famView})[tab]();
  }
  return upd;
}
