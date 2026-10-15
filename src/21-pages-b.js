/* ================= TASKS ================= */
var TASK_REPEAT=[['none','Does not repeat'],['daily','Every day'],['weekly','Every week'],['monthly','Every month']];
function taskLists(){
  var set={};['To-do','Chores'].forEach(function(l){set[l]=1});
  col('tasks').items.forEach(function(t){if(t.list)set[t.list]=1});
  return Object.keys(set);
}
function nextDue(t){
  var base=t.due||today(),d=parseD(base);
  if(t.repeat==='daily')d.setDate(d.getDate()+1);else if(t.repeat==='weekly')d.setDate(d.getDate()+7);else if(t.repeat==='monthly')d.setMonth(d.getMonth()+1);
  var n=dstr(d);return n<=today()&&t.repeat==='daily'?addDays(today(),1):n;
}
function toggleTask(x){
  if(!x.done&&x.repeat&&x.repeat!=='none'){
    var nd=nextDue(x);col('tasks').patch(x.id,{due:nd,lastDone:today()});toast('Done. Next one is '+relDay(nd));return;
  }
  col('tasks').patch(x.id,{done:!x.done,doneAt:!x.done?Date.now():null});
  if(!x.done)toast('Task completed','Undo',function(){col('tasks').patch(x.id,{done:false,doneAt:null})});
}
function taskRow(x,compact){
  var late=x.due&&!x.done&&x.due<today();
  var meta=[];
  if(x.due)meta.push(relDay(x.due));if(x.repeat&&x.repeat!=='none')meta.push('🔁');if(!compact&&x.list)meta.push(x.list);
  return h('div',{class:'item'+(x.done?' done':'')},
    h('button',{class:'check',type:'button',role:'checkbox','aria-checked':x.done?'true':'false','aria-label':'Mark '+x.title+(x.done?' not done':' done'),onclick:function(){toggleTask(x)}},'✓'),
    h('button',{class:'t',type:'button',style:{background:'none',border:0,textAlign:'left',padding:0},onclick:function(){taskForm(x)}},
      h('b',{text:(x.priority?'❗ ':'')+x.title}),meta.length?h('small',{style:late?{color:'var(--over)'}:{},text:meta.join(' · ')}):null),
    x.assignee?avatar(x.assignee):null);
}
function taskForm(x,defaults){
  var isNew=!x;x=x||Object.assign({list:'To-do',priority:0,repeat:'none',assignee:'',due:''},defaults||{});
  var lists=taskLists();
  openForm({title:isNew?'New task':'Edit task',values:Object.assign({},x,{newList:''}),saveLabel:isNew?'Add task':'Save',
    fields:[
      {k:'title',label:'Task',req:true,ph:'Pay school fees, take out bins…'},
      {k:'assignee',label:'Who does it',type:'one',none:true},
      {k:'due',label:'Due date (optional)',type:'date'},
      {k:'priority',label:'Priority',type:'chips',opts:[[0,'Normal'],[1,'High ❗']]},
      {k:'repeat',label:'Repeats',type:'select',opts:TASK_REPEAT},
      {k:'list',label:'List',type:'select',opts:lists.map(function(l){return [l,l]}).concat([['__new','New list…']])},
      {k:'newList',label:'New list name',show:function(v){return v.list==='__new'}},
      {k:'notes',label:'Notes (optional)',type:'textarea',rows:3}],
    save:function(v){
      var o=Object.assign({},x,v);
      if(o.list==='__new')o.list=(v.newList||'').trim()||'To-do';delete o.newList;
      o.priority=Number(o.priority)||0;
      if(isNew){o.done=false;col('tasks').add(o)}else col('tasks').save(o);
      toast(isNew?'Task added':'Saved');
    },
    del:isNew?null:function(){col('tasks').del(x.id);toast('Task deleted')}});
}
function pageTasks(el){
  var curList='All',mine=false,showDone=false;
  var tabs=h('div'),lists=h('div'),body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  var input=h('input',{type:'text',placeholder:'Add a task…','aria-label':'Add a task',enterkeyhint:'done',maxlength:'120'});
  function quick(){var v=input.value.trim();if(!v)return;
    col('tasks').add({title:v,list:curList==='All'?'To-do':curList,priority:0,repeat:'none',assignee:mine?S.uid:'',due:'',done:false});input.value='';input.focus()}
  input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();quick()}});
  el.append(pageHead('Tasks',null,[]),segControl([['t','Tasks'],['s','Shopping']],'t',function(v){if(v==='s')go('shop')}),
    h('div',{class:'quickadd'},input,h('button',{class:'btn primary',type:'button',onclick:quick},'Add')),lists,body,fab('Task',function(){taskForm(null,{list:curList==='All'?'To-do':curList,assignee:mine?S.uid:''})}));
  function upd(){
    var all=col('tasks').items;
    lists.replaceChildren();
    var opts=[['All','All']].concat(taskLists().map(function(l){return [l,l]})),g=chipGroup(opts.concat([['__new','＋ New list']]),curList,false,function(v){
      if(v==='__new'){taskForm(null,{list:'__new'});return}curList=v;upd()});
    g.classList.add('scroll');lists.append(g);
    lists.append(h('div',{class:'row',style:{marginTop:'10px'}},chipGroup([['all','Everyone'],['mine','Mine']],mine?'mine':'all',false,function(v){mine=v==='mine';upd()})));
    var items=all.filter(function(t){return (curList==='All'||t.list===curList)&&(!mine||t.assignee===S.uid)});
    var open=items.filter(function(t){return !t.done}),done=items.filter(function(t){return t.done});
    body.replaceChildren();
    var t=today(),groups=[['Overdue',open.filter(function(x){return x.due&&x.due<t})],['Today',open.filter(function(x){return x.due===t})],['Upcoming',open.filter(function(x){return x.due&&x.due>t}).sort(function(a,b){return a.due<b.due?-1:1})],['No date',open.filter(function(x){return !x.due})]];
    groups.forEach(function(g){
      if(!g[1].length)return;
      var c=h('section',{class:'card'},h('div',{class:'label',text:g[0]+' · '+g[1].length}));
      var l=h('div',{class:'list'});g[1].sort(function(a,b){return (b.priority||0)-(a.priority||0)}).forEach(function(x){l.append(taskRow(x))});c.append(l);body.append(c);
    });
    if(!open.length)body.append(h('div',{class:'card'},emptyState('🎉','All done! Add a task above.')));
    if(done.length){
      var c2=h('section',{class:'card'});
      c2.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){showDone=!showDone;upd()}},(showDone?'Hide':'Show')+' completed ('+done.length+')'));
      if(showDone){var l2=h('div',{class:'list'});done.sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0)}).slice(0,50).forEach(function(x){l2.append(taskRow(x))});c2.append(l2,h('button',{class:'btn sm danger',type:'button',style:{alignSelf:'flex-start'},onclick:function(){askConfirm('Delete all '+done.length+' completed tasks?','Delete',function(){done.forEach(function(x){col('tasks').del(x.id)})})}},'Clear completed'))}
      body.append(c2);
    }
  }
  return upd;
}

/* ================= SHOPPING ================= */
var SHOP_CATS=[['produce','🥬 Produce'],['dairy','🥛 Dairy & eggs'],['meat','🍗 Meat & fish'],['bakery','🍞 Bakery'],['pantry','🥫 Pantry'],['frozen','🧊 Frozen'],['drinks','🥤 Drinks'],['snacks','🍪 Snacks'],['household','🧽 Household'],['personal','🧴 Personal care'],['other','🛍️ Other']];
var CAT_WORDS={
  produce:'apple banana orange lemon lime grape berry strawberr blueberr mango avocado tomato onion garlic potato carrot cucumber lettuce spinach broccoli pepper capsicum cabbage cauliflower ginger coriander cilantro mint herb pumpkin corn mushroom salad fruit veg beans peas okra brinjal eggplant zucchini celery',
  dairy:'milk cheese butter yogurt yoghurt curd cream egg paneer ghee',
  meat:'chicken beef pork lamb mutton fish salmon tuna shrimp prawn turkey bacon sausage ham meat',
  bakery:'bread bun roll bagel tortilla naan pita cake muffin croissant',
  pantry:'rice flour sugar salt oil pasta noodle cereal oats lentil dal chickpea sauce ketchup spice masala honey jam peanut spread soup can beans vinegar atta rava',
  frozen:'frozen ice pizza fries',
  drinks:'water juice soda cola coffee tea beer wine drink',
  snacks:'chip cookie biscuit cracker chocolate candy popcorn nuts snack',
  household:'detergent soap dish sponge trash bag paper towel tissue foil cleaner bleach battery bulb laundry toilet',
  personal:'shampoo conditioner toothpaste toothbrush deodorant lotion razor sanitary diaper wipes'
};
function guessCat(name){
  var n=name.toLowerCase();
  for(var c in CAT_WORDS){if(CAT_WORDS[c].split(' ').some(function(w){return n.indexOf(w)>=0}))return c}
  return 'other';
}
var COMMON_ITEMS='Milk,Eggs,Bread,Butter,Cheese,Yogurt,Rice,Atta (flour),Dal,Onions,Tomatoes,Potatoes,Bananas,Apples,Chicken,Cooking oil,Sugar,Salt,Tea,Coffee,Water,Toilet paper,Dish soap,Laundry detergent,Paper towels,Trash bags,Shampoo,Toothpaste'.split(',');
var extraShopLists=[];
function shopLists(){var s={Groceries:1};extraShopLists.forEach(function(l){s[l]=1});col('shop').items.forEach(function(i){if(i.list)s[i.list]=1});return Object.keys(s)}
function parseItem(txt){
  var m=txt.trim().match(/^(\d+(?:\.\d+)?)\s*(?:x|×)?\s+(.+)$/i);
  if(m)return {name:m[2].trim(),qty:m[1]};
  m=txt.trim().match(/^(.+?)\s*(?:x|×)\s*(\d+)$/i);
  if(m)return {name:m[1].trim(),qty:m[2]};
  return {name:txt.trim(),qty:''};
}
function addShopItems(text,list){
  var names=text.split(/[,\n]/).map(function(s){return s.trim()}).filter(Boolean),n=0;
  names.forEach(function(t){
    var p=parseItem(t);if(!p.name)return;
    var dup=col('shop').items.filter(function(i){return !i.done&&i.list===list&&i.name.toLowerCase()===p.name.toLowerCase()})[0];
    if(dup){return}
    col('shop').add({name:p.name.charAt(0).toUpperCase()+p.name.slice(1),qty:p.qty,list:list,cat:guessCat(p.name),done:false});n++;
  });
  return n;
}
function shopQuick(){
  var list='Groceries',input=h('input',{type:'text',placeholder:'Milk, 2 bananas, bread…','aria-label':'Items to add',enterkeyhint:'done'});
  var sug=h('div',{class:'chips'});
  function drawSug(){
    sug.replaceChildren();var q=input.value.split(',').pop().trim().toLowerCase();
    var seen={},pool=col('shop').items.map(function(i){return i.name}).concat(COMMON_ITEMS).filter(function(n){var k=n.toLowerCase();if(seen[k])return false;seen[k]=1;return true});
    var hits=(q?pool.filter(function(n){return n.toLowerCase().indexOf(q)===0}):pool.slice(0,0)).slice(0,8);
    hits.forEach(function(n){sug.append(h('button',{class:'chip',type:'button',onclick:function(){var parts=input.value.split(',');parts[parts.length-1]=' '+n;input.value=parts.join(',').replace(/^\s+/,'');input.focus();drawSug()}},n))});
  }
  input.addEventListener('input',drawSug);
  var el=openSheet('Add to shopping list',h('form',{class:'form',onsubmit:function(e){e.preventDefault();var n=addShopItems(input.value,list);if(n){toast(n+(n===1?' item':' items')+' added');input.value='';drawSug()}}},input,sug,
    h('button',{class:'btn primary wide',type:'submit'},'Add'),h('button',{class:'btn wide',type:'button',onclick:function(){el.close()}},'Done')));
}
function shopForm(x){
  openForm({title:'Edit item',values:x,fields:[{k:'name',label:'Item',req:true},{k:'qty',label:'Quantity (optional)',ph:'2, 1 kg, a dozen'},
    {k:'cat',label:'Aisle',type:'select',opts:SHOP_CATS.map(function(c){return [c[0],c[1]]})},
    {k:'list',label:'List',type:'select',opts:shopLists().map(function(l){return [l,l]})}],
    save:function(v){col('shop').save(Object.assign({},x,v))},del:function(){col('shop').del(x.id)}});
}
function pageShop(el){
  var curList='Groceries';
  var lists=h('div'),body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  var input=h('input',{type:'text',placeholder:'Add item… (2 milk, bread)','aria-label':'Add shopping item',enterkeyhint:'done',maxlength:'80'});
  var sug=h('div',{class:'chips scroll'});
  function quick(){var v=input.value.trim();if(!v)return;addShopItems(v,curList);input.value='';drawSug();input.focus()}
  function drawSug(){
    sug.replaceChildren();var q=input.value.trim().toLowerCase();if(!q)return;
    var seen={},pool=col('shop').items.map(function(i){return i.name}).concat(COMMON_ITEMS).filter(function(n){var k=n.toLowerCase();if(seen[k])return false;seen[k]=1;return true});
    pool.filter(function(n){return n.toLowerCase().indexOf(q)===0&&n.toLowerCase()!==q}).slice(0,8).forEach(function(n){sug.append(h('button',{class:'chip',type:'button',onclick:function(){input.value=n;quick()}},n))});
  }
  input.addEventListener('input',drawSug);
  input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();quick()}});
  var head=h('div');
  function shareList(open){
    var text=curList+':\n'+open.map(function(i){return '• '+i.name+(i.qty?' ('+i.qty+')':'')}).join('\n');
    if(navigator.share)navigator.share({title:curList,text:text}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){toast('List copied')});
  }
  el.append(head,segControl([['t','Tasks'],['s','Shopping']],'s',function(v){if(v==='t')go('tasks')}),
    h('div',{class:'quickadd shopadd'},input,h('button',{class:'ibtn brand',type:'button','aria-label':'Add item',onclick:quick},ico('plus'))),sug,lists,body);
  function upd(){
    var ls=shopLists();if(ls.indexOf(curList)<0)curList='Groceries';
    lists.replaceChildren();
    var g=chipGroup(ls.map(function(l){return [l,l]}).concat([['__new','＋ New list']]),curList,false,function(v){
      if(v==='__new'){
        var ni=h('input',{type:'text',placeholder:'e.g. Costco, Pharmacy, Party',maxlength:'30','aria-label':'List name'});
        var el2=openSheet('New list',h('form',{class:'form',onsubmit:function(e){e.preventDefault();var n=ni.value.trim();if(!n)return;curList=n;if(extraShopLists.indexOf(n)<0)extraShopLists.push(n);el2.close();upd()}},ni,h('button',{class:'btn primary wide',type:'submit'},'Create list'),h('div',{class:'muted small',text:'Then add items from the box above.'})));
        return;}
      curList=v;upd()});
    g.classList.add('scroll');lists.append(g);
    var items=col('shop').items.filter(function(i){return i.list===curList});
    var open=items.filter(function(i){return !i.done}),done=items.filter(function(i){return i.done});
    body.replaceChildren();
    head.replaceChildren(pageHead('Shopping',open.length?open.length+' to buy'+(done.length?' · '+done.length+' in the basket':''):'All done',
      open.length?[h('button',{class:'btn sm',type:'button',onclick:function(){shareList(open)}},'Share')]:null));
    if(!open.length)body.append(h('div',{class:'card'},emptyState('🛒','Nothing to buy. Type an item above.')));
    else{
      // one compact card, grouped by aisle
      var card=h('section',{class:'card shoplist'});
      SHOP_CATS.forEach(function(c){
        var rows=open.filter(function(i){return (i.cat||'other')===c[0]});if(!rows.length)return;
        var g=h('div',{class:'aisle'},h('div',{class:'aislehead'},h('span',{text:String(c[1]).replace(/^[^A-Za-z0-9]+/,'')}),h('span',{class:'cnt',text:rows.length})));
        rows.sort(function(a,b){return a.name<b.name?-1:1}).forEach(function(x){g.append(shopRow(x))});card.append(g);
      });
      body.append(card);
    }
    if(done.length){
      var l2=h('div',{class:'shoplist'});done.forEach(function(x){l2.append(shopRow(x))});
      body.append(h('details',{class:'card basket'},h('summary',null,h('span',{class:'grow',text:'In the basket · '+done.length}),
        h('button',{class:'btn sm danger',type:'button',onclick:function(e){e.preventDefault();done.forEach(function(x){col('shop').del(x.id)});toast('Cleared')}},'Clear')),l2));
    }
  }
  return upd;
}
function shopRow(x){
  return h('div',{class:'srow'+(x.done?' done':'')},
    h('button',{class:'check',type:'button',role:'checkbox','aria-checked':x.done?'true':'false','aria-label':'Mark '+x.name+(x.done?' not bought':' bought'),onclick:function(){col('shop').patch(x.id,{done:!x.done})}},'✓'),
    h('button',{class:'sname',type:'button',onclick:function(){shopForm(x)}},h('span',{class:'ellip',text:x.name}),x.qty?h('span',{class:'qty',text:x.qty}):null));
}
