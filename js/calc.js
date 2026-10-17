var RPM=(function(){
function num(v){if(v===''||v==null)return null;var n=Number(v);return isFinite(n)?n:NaN;}
function rate(pay,loaded,dead){if(!(pay>0)||!(loaded>0))return null;dead=dead>0?dead:0;var t=loaded+dead;return {perLoaded:pay/loaded,totalMiles:t,perTotal:pay/t};}
function loadPay(r,m){if(!(r>0)||!(m>0))return null;return r*m;}
function cost(fuel,mpg,other,pay,miles){if(!(fuel>0)||!(mpg>0))return null;other=other>0?other:0;var fpm=fuel/mpg,tc=fpm+other,o={fuelPerMile:fpm,costPerMile:tc};
 if(pay>0&&miles>0){o.profitPerMile=pay/miles-tc;o.profitPerLoad=pay-tc*miles;}return o;}
function startRate(p){p=Number(p);if(!(p>0)||!isFinite(p))return null;return Math.round((2+0.15*p)*100+1e-9)/100;}
function m2mi(m){m=Number(m);if(!(m>0)||!isFinite(m))return null;return Math.round(m/1609.344);}
function gmaps(o,d){return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(o)+'&destination='+encodeURIComponent(d)+'&travelmode=driving';}
function geoUrl(q){return 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us,ca&q='+encodeURIComponent(q);}
function routeUrl(a,b){return 'https://router.project-osrm.org/route/v1/driving/'+a.lon+','+a.lat+';'+b.lon+','+b.lat+'?overview=false';}
function split(pay,pct){if(!(pay>0)||!(pct>=0&&pct<=100))return null;return {truck:pay*pct/100,carrier:pay*(100-pct)/100};}
var cur=function(n){return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});};
var cpm=function(n){return (n<0?'-':'')+'$'+Math.abs(n).toFixed(3);};
return {num:num,rate:rate,loadPay:loadPay,cost:cost,split:split,startRate:startRate,m2mi:m2mi,gmaps:gmaps,geoUrl:geoUrl,routeUrl:routeUrl,cur:cur,cpm:cpm};})();
if(typeof module!=='undefined')module.exports=RPM;
if(typeof document!=='undefined')(function(){
var $=function(i){return document.getElementById(i);};
function row(a,b){return '<div><span>'+a+'</span><b>'+b+'</b></div>';}
function read(ids,err){var o={},bad=[];ids.forEach(function(i){var el=$(i),v=RPM.num(el.value);var b=isNaN(v)||(v!==null&&v<0);el.classList.toggle('bad',b);if(b)bad.push(i);o[i]=b?null:v;});$(err).textContent=bad.length?'Please enter positive numbers only.':'';return o;}
function run(){var a=read(['pay','loaded','dead'],'e1'),r=RPM.rate(a.pay,a.loaded,a.dead);
 $('r1').innerHTML=r?row('Rate per loaded mile',RPM.cur(r.perLoaded))+(a.dead>0?row('Total miles',r.totalMiles.toLocaleString('en-US'))+row('Rate per total mile',RPM.cur(r.perTotal)):''):'Enter pay and loaded miles.';
 var b=read(['rate','miles'],'e2'),lp=RPM.loadPay(b.rate,b.miles);$('r2').innerHTML=lp!=null?row('Load pay',RPM.cur(lp)):'Enter a rate and miles.';
 var c=read(['fuel','mpg','other'],'e3'),cm=RPM.cost(c.fuel,c.mpg,c.other,a.pay,r?r.totalMiles:null);
 $('r3').innerHTML=cm?row('Fuel cost per mile',RPM.cpm(cm.fuelPerMile))+row('Total cost per mile',RPM.cpm(cm.costPerMile))+(cm.profitPerMile!=null?row('Est. profit per mile',RPM.cpm(cm.profitPerMile))+row('Est. profit per load',RPM.cur(cm.profitPerLoad)):''):'Enter fuel price and MPG.';
 var d=read(['pct'],'e4');if(d.pct>100){$('pct').classList.add('bad');$('e4').textContent='Percent must be 0 to 100.';}
 var pay=a.pay>0?a.pay:lp,s=RPM.split(pay,d.pct);$('r4').innerHTML=s?row("Truck's share",RPM.cur(s.truck))+row('Carrier share',RPM.cur(s.carrier))+'<p class="note">The carrier share pays for insurance, plates, permits and fuel tax.</p>':'Enter a load pay above.';}
document.querySelectorAll('input').forEach(function(i){i.addEventListener('input',run);});run();
function geo(q,label){return fetch(RPM.geoUrl(q),{headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok)throw 'net';return r.json();}).then(function(j){
 if(!j||!j.length)throw {nf:label};var lat=Number(j[0].lat),lon=Number(j[0].lon);if(!isFinite(lat)||!isFinite(lon))throw {nf:label};return {lat:lat,lon:lon};});}
function getMiles(){var o=$('orig').value.trim(),d=$('dest').value.trim(),msg=$('mimsg'),lk=$('gmap'),bt=$('getmi');
 msg.classList.remove('err');
 if(!o||!d){msg.classList.add('err');msg.textContent='Enter both an origin and a destination.';lk.hidden=true;return;}
 lk.href=RPM.gmaps(o,d);lk.hidden=false;
 if(!window.fetch){msg.classList.add('err');msg.textContent='Could not look up miles in this browser. Please enter miles yourself.';return;}
 bt.disabled=true;msg.textContent='Looking up miles\u2026';var a;
 geo(o,'origin').then(function(x){a=x;return geo(d,'destination');}).then(function(b){return fetch(RPM.routeUrl(a,b));}).then(function(r){if(!r.ok)throw 'net';return r.json();}).then(function(j){
  var mi=j&&j.code==='Ok'&&j.routes&&j.routes[0]?RPM.m2mi(j.routes[0].distance):null;if(!mi)throw 'noroute';
  $('loaded').value=mi;$('miles').value=mi;run();
  msg.textContent='Approx. driving miles: '+mi.toLocaleString('en-US')+' (car route via OpenStreetMap; truck routes may differ)';
 }).catch(function(e){msg.classList.add('err');
  msg.textContent=(e&&e.nf?'Could not find the '+e.nf+'. Try a city and state, like "South Bend, IN".':e==='noroute'?'Could not find a driving route between those places.':'Could not reach the mileage service right now.')+' Please enter miles yourself.';
 }).then(function(){bt.disabled=false;});}
$('getmi').addEventListener('click',getMiles);
['orig','dest'].forEach(function(i){$(i).addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();getMiles();}});});
var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
if(window.fetch)fetch('data/diesel.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(d){
 var p=Number(d.price),w=String(d.week||'').split('-');if(!(p>0)||w.length!==3)return;
 var el=$('fuel');if(el.value==='')el.value=p.toFixed(3);
 var sr=RPM.startRate(p),re=$('rate');if(sr&&re&&re.value===''){re.value=sr.toFixed(2);$('ratesrc').textContent='Starting rate: $2.00 + 15% of this week\'s DOE diesel price ($'+p.toFixed(3)+') = $'+sr.toFixed(2)+'/mile. Type over it to use your own.';}
 $('fuelsrc').innerHTML='<a href="https://www.eia.gov/petroleum/gasdiesel/" target="_blank" rel="noopener">DOE/EIA U.S. average diesel</a>, week of '+MO[+w[1]-1]+' '+(+w[2])+', '+w[0]+': $'+p.toFixed(3)+'/gal. You can type over it.';
 run();}).catch(function(){});})();
