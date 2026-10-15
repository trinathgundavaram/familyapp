/* ================= MONEY ================= */
var EXP_CATS=[['groceries','Groceries','🛒','#10B981'],['dining','Eating out','🍔','#F59E0B'],['transport','Transport','🚗','#3B82F6'],['home','Home & rent','🏠','#8B5CF6'],['bills','Bills & utilities','💡','#EAB308'],['health','Health','🩺','#EF4444'],['kids','Kids & school','🎒','#EC4899'],['shopping','Shopping','🛍️','#14B8A6'],['fun','Fun','🎬','#F97316'],['travel','Travel','✈️','#0EA5E9'],['gifts','Gifts & giving','🎁','#A855F7'],['other','Other','📦','#6B7280']];
var INC_CATS=[['salary','Salary','💼','#10B981'],['business','Business','🏪','#3B82F6'],['gift','Gift','🎁','#EC4899'],['refund','Refund','↩️','#F59E0B'],['other','Other income','💵','#6B7280']];
function catInfo(id,type){var l=type==='income'?INC_CATS:EXP_CATS;return l.filter(function(c){return c[0]===id})[0]||l[l.length-1]}
function monthTx(mk){return col('txns').items.filter(function(x){return monthKey(x.date)===mk})}
function billDue(b,mk){
  var dt=mk.split('-').map(Number),last=new Date(dt[0],dt[1],0).getDate(),day=Math.min(Number(b.day)||1,last);
  return mk+'-'+pad(day);
}
function dueBills(){
  var t=today(),mk=monthKey(t),out=[];
  col('bills').items.forEach(function(b){
    if(b.paid&&b.paid[mk])return;
    var d=billDue(b,mk),diff=diffDays(d,t);
    if(diff<=7)out.push({id:b.id,name:b.name,amount:b.amount,dueDate:d,late:diff<0});
  });
  return out.sort(function(a,b){return a.dueDate<b.dueDate?-1:1});
}
function txnForm(x,defaults){
  var isNew=!x;x=x||Object.assign({type:'expense',amount:'',date:today(),who:S.uid,cat:'groceries',note:''},defaults||{});
  var vals=Object.assign({},x,{catI:x.type==='income'?x.cat:'salary',catE:x.type==='income'?'groceries':x.cat});
  openForm({title:isNew?'Add transaction':'Edit transaction',values:vals,saveLabel:isNew?'Save':'Save',
    fields:[
      {k:'type',label:'',type:'chips',opts:[['expense','Expense','💸'],['income','Income','💵']]},
      {k:'amount',label:'Amount',type:'money',req:true,ph:'0.00'},
      {k:'catE',label:'Category',type:'chips',opts:EXP_CATS.map(function(c){return [c[0],c[1],c[2]]}),show:function(v){return v.type==='expense'}},
      {k:'catI',label:'Category',type:'chips',opts:INC_CATS.map(function(c){return [c[0],c[1],c[2]]}),show:function(v){return v.type==='income'}},
      {k:'date',label:'Date',type:'date',req:true},
      {k:'note',label:'Note (optional)',ph:'Costco run, electricity…'},
      {k:'who',label:'Who',type:'one'}],
    validate:function(v){return v.amount>0?null:'Enter an amount above zero.'},
    save:function(v){
      var o=Object.assign({},x,{type:v.type,amount:Number(v.amount),cat:v.type==='income'?v.catI:v.catE,date:v.date,note:v.note,who:v.who});
      delete o.catI;delete o.catE;
      if(isNew)col('txns').add(o);else col('txns').save(o);
      toast(isNew?(v.type==='income'?'Income added':'Expense added'):'Saved');
    },
    del:isNew?null:function(){col('txns').del(x.id);toast('Deleted')}});
}
function billForm(b){
  var isNew=!b;b=b||{name:'',amount:'',day:1,cat:'bills'};
  openForm({title:isNew?'New monthly bill':'Edit bill',values:b,fields:[
    {k:'name',label:'Bill',req:true,ph:'Rent, electricity, internet…'},{k:'amount',label:'Amount',type:'money',req:true},
    {k:'day',label:'Due day of month (1–31)',type:'number',req:true},
    {k:'cat',label:'Category',type:'select',opts:EXP_CATS.map(function(c){return [c[0],c[2]+' '+c[1]]})}],
    validate:function(v){return v.amount>0&&v.day>=1&&v.day<=31?null:'Check the amount and due day.'},
    save:function(v){var o=Object.assign({},b,v,{amount:Number(v.amount),day:Number(v.day)});if(isNew)col('bills').add(o);else col('bills').save(o)},
    del:isNew?null:function(){col('bills').del(b.id)}});
}
function goalForm(g){
  var isNew=!g;g=g||{name:'',target:'',saved:0};
  openForm({title:isNew?'New savings goal':'Edit goal',values:g,fields:[{k:'name',label:'Goal',req:true,ph:'Vacation, new car, emergency fund…'},{k:'target',label:'Target amount',type:'money',req:true},{k:'saved',label:'Saved so far',type:'money'}],
    validate:function(v){return v.target>0?null:'Enter a target above zero.'},
    save:function(v){var o=Object.assign({},g,{name:v.name,target:Number(v.target),saved:Number(v.saved)||0});if(isNew)col('goals').add(o);else col('goals').save(o)},
    del:isNew?null:function(){col('goals').del(g.id)}});
}
function pageMoney(el){
  var mk=monthKey(today()),view='ov',q='';
  var nav=monthNav(function(){return mk},function(v){mk=v;upd()});
  var body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  var seg=segControl([['ov','Overview'],['tx','Activity'],['bills','Bills'],['goals','Goals']],view,function(v){if(v==='bills'){go('house');return}view=v;upd()});
  el.append(pageHead('Money',null,[h('button',{class:'btn sm',type:'button',onclick:function(){downloadTxns()}},ico('download'),'CSV')]),seg,nav,body,fab('Add',function(){txnForm()}));
  function downloadTxns(){
    var rows=[['date','type','category','amount','who','note']];
    col('txns').items.slice().sort(function(a,b){return a.date<b.date?-1:1}).forEach(function(x){rows.push([x.date,x.type,catInfo(x.cat,x.type)[1],x.amount,nameOf(x.who),x.note||''])});
    var csv=rows.map(function(r){return r.map(function(v){v=String(v);if(/^[=+\-@]/.test(v)&&isNaN(Number(v)))v="'"+v;return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')}).join('\n');
    var a=h('a',{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'money-'+today()+'.csv'});document.body.append(a);a.click();a.remove();
  }
  function setBudget(c,cur){
    openForm({title:'Monthly budget: '+c[1],values:{amount:cur||''},fields:[{k:'amount',label:'Amount per month',type:'money',ph:'0'}],
      save:function(v){var amt=Number(v.amount)||0;if(amt>0)col('budgets').save({id:c[0],cat:c[0],amount:amt});else col('budgets').del(c[0])}});
  }
  function overview(){
    var tx=monthTx(mk),exp=tx.filter(function(x){return x.type!=='income'}),inc=sum(tx.filter(function(x){return x.type==='income'}),function(x){return x.amount}),spent=sum(exp,function(x){return x.amount});
    body.append(h('div',{class:'kpis'},
      h('div',{class:'kpi'},h('b',{class:'num',style:{color:'var(--good)'},text:money(inc)}),h('span',{text:'Income'})),
      h('div',{class:'kpi'},h('b',{class:'num',text:money(spent)}),h('span',{text:'Spent'})),
      h('div',{class:'kpi'},h('b',{class:'num',style:{color:inc-spent<0?'var(--over)':''},text:money(inc-spent)}),h('span',{text:'Left'}))));
    var by={};exp.forEach(function(x){by[x.cat]=(by[x.cat]||0)+x.amount});
    var parts=EXP_CATS.map(function(c){return {v:by[c[0]]||0,color:c[3],c:c}}).filter(function(p){return p.v>0}).sort(function(a,b){return b.v-a.v});
    var card=h('section',{class:'card'},h('h2',{text:'Where it went'}));
    if(!parts.length)card.append(emptyState('🧾','No spending yet this month.',h('button',{class:'btn sm primary',type:'button',onclick:function(){txnForm()}},'Add an expense')));
    else{
      var lg=h('div',{class:'legend'});parts.slice(0,7).forEach(function(p){lg.append(h('div',null,h('span',{class:'dot',style:{background:p.color}}),h('span',{class:'grow ellip',text:p.c[2]+' '+p.c[1]}),h('b',{class:'num',text:money(p.v)})))});
      card.append(h('div',{class:'donut'},donut(parts,spent,money(spent),'spent'),lg));
    }
    body.append(card);
    var bc=h('section',{class:'card'},h('div',{class:'chead'},h('h2',{text:'Budgets'}),h('span',{class:'muted small',text:'Tap to set'})));
    var l=h('div',{class:'list'});
    EXP_CATS.forEach(function(c){
      var b=col('budgets').get(c[0]),sp=by[c[0]]||0;
      if(!b&&!sp)return;
      var pb=h('i');pb.style.width=b?Math.min(100,sp/b.amount*100)+'%':'0';if(b&&sp>b.amount)pb.className='over';
      l.append(h('button',{class:'item',type:'button',style:{flexDirection:'column',alignItems:'stretch',gap:'6px'},onclick:function(){setBudget(c,b&&b.amount)}},
        h('div',{class:'row'},h('span',{text:c[2]}),h('b',{class:'grow',text:c[1]}),h('span',{class:'num small',style:b&&sp>b.amount?{color:'var(--over)'}:{},text:b?money(sp)+' / '+money(b.amount):money(sp)+' · no budget'})),b?h('div',{class:'bar'},pb):null));
    });
    if(!l.children.length)l.append(h('div',{class:'muted small',style:{padding:'6px 0'},text:'Set a monthly budget for any category to see progress bars here.'}));
    bc.append(l,h('button',{class:'btn sm wide',type:'button',onclick:function(){
      var el2=openSheet('Set a budget',h('div',{class:'list'},EXP_CATS.map(function(c){var b=col('budgets').get(c[0]);return h('button',{class:'item',type:'button',onclick:function(){el2.close();setBudget(c,b&&b.amount)}},h('span',{text:c[2]}),h('div',{class:'t'},h('b',{text:c[1]})),h('span',{class:'muted small',text:b?money(b.amount):'—'}))})));
    }},'＋ Set a category budget'));
    body.append(bc);
    var pp={};exp.forEach(function(x){pp[x.who||'?']=(pp[x.who||'?']||0)+x.amount});
    var ids=Object.keys(pp);
    if(ids.length>1){var pc=h('section',{class:'card'},h('h2',{text:'By person'}));ids.sort(function(a,b){return pp[b]-pp[a]}).forEach(function(id){var pb=h('i');pb.style.width=(pp[id]/spent*100)+'%';pc.append(h('div',{class:'row'},avatar(id),h('span',{class:'grow',text:nameOf(id)}),h('b',{class:'num',text:money(pp[id])})),h('div',{class:'bar'},pb))});body.append(pc)}
  }
  function activity(){
    var input=h('input',{type:'search',placeholder:'Search notes and categories','aria-label':'Search transactions',value:q});
    var list=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
    function fill(){
      list.replaceChildren();var tx=monthTx(mk).filter(function(x){var s=((x.note||'')+' '+catInfo(x.cat,x.type)[1]+' '+nameOf(x.who)).toLowerCase();return !q||s.indexOf(q.toLowerCase())>=0}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:(b.at||0)-(a.at||0)});
      if(!tx.length){list.append(h('div',{class:'card'},emptyState('🧾','No transactions found.')));return}
      var groups={};tx.forEach(function(x){(groups[x.date]=groups[x.date]||[]).push(x)});
      Object.keys(groups).sort().reverse().forEach(function(d){
        var tot=sum(groups[d],function(x){return x.type==='income'?x.amount:-x.amount});
        var c=h('section',{class:'card'},h('div',{class:'row'},h('div',{class:'label grow',text:dayLabel(d)}),h('span',{class:'small muted num',text:money(tot)})));
        var l=h('div',{class:'list'});
        groups[d].forEach(function(x){var ci=catInfo(x.cat,x.type);
          l.append(h('button',{class:'item',type:'button',onclick:function(){txnForm(x)}},h('span',{class:'avatar',style:{background:ci[3]+'33'},text:ci[2]}),h('div',{class:'t'},h('b',{text:x.note||ci[1]}),h('small',{text:ci[1]+' · '+nameOf(x.who)})),h('b',{class:'num',style:{color:x.type==='income'?'var(--good)':''},text:(x.type==='income'?'+':'')+money(x.amount,true)})))});
        c.append(l);list.append(c);
      });
    }
    input.addEventListener('input',function(){q=input.value;fill()});
    body.append(input,list);fill();
  }
  function bills(){
    var bl=col('bills').items.slice().sort(function(a,b){return a.day-b.day}),t=today(),cur=monthKey(t);
    var total=sum(bl,function(b){return b.amount});
    var card=h('section',{class:'card'},h('div',{class:'chead'},h('h2',{text:'Monthly bills'}),h('button',{class:'btn sm primary',type:'button',onclick:function(){billForm()}},'+ Bill')));
    if(bl.length)card.append(h('div',{class:'muted small',text:money(total)+' a month in total'}));
    var l=h('div',{class:'list'});
    bl.forEach(function(b){
      var paid=b.paid&&b.paid[mk],d=billDue(b,mk),late=!paid&&mk<=cur&&diffDays(d,t)<0;
      l.append(h('div',{class:'item'},
        h('button',{class:'t',type:'button',style:{background:'none',border:0,textAlign:'left',padding:0},onclick:function(){billForm(b)}},h('b',{text:b.name}),h('small',{text:'Due '+dayLabel(d)+' · '+money(b.amount)})),
        paid?h('span',{class:'pill green',text:'Paid ✓'}):h('button',{class:'btn sm'+(late?'':' primary'),type:'button',onclick:function(){
          var p=Object.assign({},b.paid||{});p[mk]=true;col('bills').patch(b.id,{paid:p});
          col('txns').add({type:'expense',amount:b.amount,cat:b.cat||'bills',date:mk===cur?t:d,who:S.uid,note:b.name+' (bill)'});toast(b.name+' marked paid')}},late?'Overdue · Pay':'Mark paid')));
    });
    if(!bl.length)l.append(emptyState('💡','Add rent, electricity, internet and other monthly bills to get reminders on Home.'));
    card.append(l);body.append(card);
  }
  function goals(){
    var card=h('section',{class:'card'},h('div',{class:'chead'},h('h2',{text:'Savings goals'}),h('button',{class:'btn sm primary',type:'button',onclick:function(){goalForm()}},'+ Goal')));
    var l=h('div',{class:'list'});
    col('goals').items.forEach(function(g){
      var pb=h('i');pb.style.width=Math.min(100,g.saved/g.target*100)+'%';
      l.append(h('div',{class:'item',style:{flexDirection:'column',alignItems:'stretch',gap:'8px'}},
        h('div',{class:'row'},h('button',{class:'grow',type:'button',style:{background:'none',border:0,textAlign:'left',padding:0,fontWeight:'700'},onclick:function(){goalForm(g)}},'🎯 '+g.name),h('span',{class:'num small',text:money(g.saved)+' / '+money(g.target)})),
        h('div',{class:'bar'},pb),
        h('div',{class:'row'},h('span',{class:'small muted',text:Math.round(g.saved/g.target*100)+'% saved'}),h('button',{class:'btn sm right',type:'button',onclick:function(){openForm({title:'Add to “'+g.name+'”',values:{amt:''},fields:[{k:'amt',label:'Amount to add',type:'money',req:true}],save:function(v){col('goals').patch(g.id,{saved:g.saved+Number(v.amt)});toast('Added to '+g.name)}})}},'+ Add money'))));
    });
    if(!l.children.length)l.append(emptyState('🎯','Save toward something: a trip, a car, an emergency fund.'));
    card.append(l);body.append(card);
  }
  function upd(){
    nav.upd();nav.hidden=view==='bills'||view==='goals';
    $('.fab',el)&&($('.fab',el).hidden=view==='bills'||view==='goals');
    var active=document.activeElement;
    if(view==='tx'&&active&&active.type==='search'&&body.contains(active))return;
    body.replaceChildren();
    ({ov:overview,tx:activity,bills:bills,goals:goals})[view]();
  }
  return upd;
}
