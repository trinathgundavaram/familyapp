App.routes={
  home:{page:pageHome,wide:true},more:{page:pageMore},cal:{page:pageCal},timetable:{page:pageTimetable,wide:true},
  tasks:{page:pageTasks},shop:{page:pageShop},money:{page:pageMoney},food:{page:pageFood},
  trips:{page:pageTrips,wide:true},meals:{page:pageMeals,wide:true},notes:{page:pageNotes,wide:true},family:{page:pageFamily}
};
(async function main(){
  try{
    var sz=LSget('nourish2:size','n');if(sz==='l'||sz==='xl')document.documentElement.setAttribute('data-size',sz);
    var th=LSget('nourish2:theme','auto');if(th==='light'||th==='dark')document.documentElement.setAttribute('data-theme',th);
  }catch(e){}
  buildShell();
  $('#view').append(h('div',{class:'page'},h('div',{class:'empty'},h('span',{class:'spin'}),'Loading your family…')));
  await startStore();
  window.addEventListener('hashchange',navigate);
  navigate();
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker.register('sw.js').catch(function(){})}
})();
