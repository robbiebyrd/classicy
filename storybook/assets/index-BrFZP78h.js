import{at as Tn,i as An}from"./iframe-CeNn_Py-.js";import{H as Bf,C as Wf}from"./hls-BAQ9y_Gt.js";import{C as Wn,M as Ff}from"./mixin-BY5xW4uI.js";import"./preload-helper-PPVm8Dsz.js";var Kf=Object.create,Dm=Object.defineProperty,Vf=Object.getOwnPropertyDescriptor,qf=Object.getOwnPropertyNames,Yf=Object.getPrototypeOf,Gf=Object.prototype.hasOwnProperty,Mm=function(t,e){return function(){return t&&(e=t(t=0)),e}},Ge=function(t,e){return function(){return e||t((e={exports:{}}).exports,e),e.exports}},zf=function(t,e,i,a){if(e&&typeof e=="object"||typeof e=="function")for(var r=qf(e),n=0,s=r.length,o;n<s;n++)o=r[n],!Gf.call(t,o)&&o!==i&&Dm(t,o,{get:(function(l){return e[l]}).bind(null,o),enumerable:!(a=Vf(e,o))||a.enumerable});return t},ut=function(t,e,i){return i=t!=null?Kf(Yf(t)):{},zf(!t||!t.__esModule?Dm(i,"default",{value:t,enumerable:!0}):i,t)},Jt=Ge(function(t,e){var i;typeof window<"u"?i=window:typeof global<"u"?i=global:typeof self<"u"?i=self:i={},e.exports=i});function fa(t,e){return e!=null&&typeof Symbol<"u"&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):fa(t,e)}var Ea=Mm(function(){Ea()});function Om(t){"@swc/helpers - typeof";return t&&typeof Symbol<"u"&&t.constructor===Symbol?"symbol":typeof t}var xm=Mm(function(){}),Nm=Ge(function(t,e){var i=Array.prototype.slice;e.exports=a;function a(r,n){for(("length"in r)||(r=[r]),r=i.call(r);r.length;){var s=r.shift(),o=n(s);if(o)return o;s.childNodes&&s.childNodes.length&&(r=i.call(s.childNodes).concat(r))}}}),Qf=Ge(function(t,e){Ea(),e.exports=i;function i(a,r){if(!fa(this,i))return new i(a,r);this.data=a,this.nodeValue=a,this.length=a.length,this.ownerDocument=r||null}i.prototype.nodeType=8,i.prototype.nodeName="#comment",i.prototype.toString=function(){return"[object Comment]"}}),jf=Ge(function(t,e){Ea(),e.exports=i;function i(a,r){if(!fa(this,i))return new i(a);this.data=a||"",this.length=this.data.length,this.ownerDocument=r||null}i.prototype.type="DOMTextNode",i.prototype.nodeType=3,i.prototype.nodeName="#text",i.prototype.toString=function(){return this.data},i.prototype.replaceData=function(a,r,n){var s=this.data,o=s.substring(0,a),l=s.substring(a+r,s.length);this.data=o+n+l,this.length=this.data.length}}),Pm=Ge(function(t,e){e.exports=i;function i(a){var r=this,n=a.type;a.target||(a.target=r),r.listeners||(r.listeners={});var s=r.listeners[n];if(s)return s.forEach(function(o){a.currentTarget=r,typeof o=="function"?o(a):o.handleEvent(a)});r.parentNode&&r.parentNode.dispatchEvent(a)}}),$m=Ge(function(t,e){e.exports=i;function i(a,r){var n=this;n.listeners||(n.listeners={}),n.listeners[a]||(n.listeners[a]=[]),n.listeners[a].indexOf(r)===-1&&n.listeners[a].push(r)}}),Um=Ge(function(t,e){e.exports=i;function i(a,r){var n=this;if(n.listeners&&n.listeners[a]){var s=n.listeners[a],o=s.indexOf(r);o!==-1&&s.splice(o,1)}}}),Zf=Ge(function(t,e){xm(),e.exports=a;var i=["area","base","br","col","embed","hr","img","input","keygen","link","menuitem","meta","param","source","track","wbr"];function a(h){switch(h.nodeType){case 3:return m(h.data);case 8:return"<!--"+h.data+"-->";default:return r(h)}}function r(h){var d=[],v=h.tagName;return h.namespaceURI==="http://www.w3.org/1999/xhtml"&&(v=v.toLowerCase()),d.push("<"+v+u(h)+o(h)),i.indexOf(v)>-1?d.push(" />"):(d.push(">"),h.childNodes.length?d.push.apply(d,h.childNodes.map(a)):h.textContent||h.innerText?d.push(m(h.textContent||h.innerText)):h.innerHTML&&d.push(h.innerHTML),d.push("</"+v+">")),d.join("")}function n(h,d){var v=Om(h[d]);return d==="style"&&Object.keys(h.style).length>0?!0:h.hasOwnProperty(d)&&(v==="string"||v==="boolean"||v==="number")&&d!=="nodeName"&&d!=="className"&&d!=="tagName"&&d!=="textContent"&&d!=="innerText"&&d!=="namespaceURI"&&d!=="innerHTML"}function s(h){if(typeof h=="string")return h;var d="";return Object.keys(h).forEach(function(v){var E=h[v];v=v.replace(/[A-Z]/g,function(b){return"-"+b.toLowerCase()}),d+=v+":"+E+";"}),d}function o(h){var d=h.dataset,v=[];for(var E in d)v.push({name:"data-"+E,value:d[E]});return v.length?l(v):""}function l(h){var d=[];return h.forEach(function(v){var E=v.name,b=v.value;E==="style"&&(b=s(b)),d.push(E+'="'+p(b)+'"')}),d.length?" "+d.join(" "):""}function u(h){var d=[];for(var v in h)n(h,v)&&d.push({name:v,value:h[v]});for(var E in h._attributes)for(var b in h._attributes[E]){var y=h._attributes[E][b],T=(y.prefix?y.prefix+":":"")+b;d.push({name:T,value:y.value})}return h.className&&d.push({name:"class",value:h.className}),d.length?l(d):""}function m(h){var d="";return typeof h=="string"?d=h:h&&(d=h.toString()),d.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function p(h){return m(h).replace(/"/g,"&quot;")}}),Hm=Ge(function(t,e){Ea();var i=Nm(),a=Pm(),r=$m(),n=Um(),s=Zf(),o="http://www.w3.org/1999/xhtml";e.exports=l;function l(u,m,p){if(!fa(this,l))return new l(u);var h=p===void 0?o:p||null;this.tagName=h===o?String(u).toUpperCase():u,this.nodeName=this.tagName,this.className="",this.dataset={},this.childNodes=[],this.parentNode=null,this.style={},this.ownerDocument=m||null,this.namespaceURI=h,this._attributes={},this.tagName==="INPUT"&&(this.type="text")}l.prototype.type="DOMElement",l.prototype.nodeType=1,l.prototype.appendChild=function(u){return u.parentNode&&u.parentNode.removeChild(u),this.childNodes.push(u),u.parentNode=this,u},l.prototype.replaceChild=function(u,m){u.parentNode&&u.parentNode.removeChild(u);var p=this.childNodes.indexOf(m);return m.parentNode=null,this.childNodes[p]=u,u.parentNode=this,m},l.prototype.removeChild=function(u){var m=this.childNodes.indexOf(u);return this.childNodes.splice(m,1),u.parentNode=null,u},l.prototype.insertBefore=function(u,m){u.parentNode&&u.parentNode.removeChild(u);var p=m==null?-1:this.childNodes.indexOf(m);return p>-1?this.childNodes.splice(p,0,u):this.childNodes.push(u),u.parentNode=this,u},l.prototype.setAttributeNS=function(u,m,p){var h=null,d=m,v=m.indexOf(":");if(v>-1&&(h=m.substr(0,v),d=m.substr(v+1)),this.tagName==="INPUT"&&m==="type")this.type=p;else{var E=this._attributes[u]||(this._attributes[u]={});E[d]={value:p,prefix:h}}},l.prototype.getAttributeNS=function(u,m){var p=this._attributes[u],h=p&&p[m]&&p[m].value;return this.tagName==="INPUT"&&m==="type"?this.type:typeof h!="string"?null:h},l.prototype.removeAttributeNS=function(u,m){var p=this._attributes[u];p&&delete p[m]},l.prototype.hasAttributeNS=function(u,m){var p=this._attributes[u];return!!p&&m in p},l.prototype.setAttribute=function(u,m){return this.setAttributeNS(null,u,m)},l.prototype.getAttribute=function(u){return this.getAttributeNS(null,u)},l.prototype.removeAttribute=function(u){return this.removeAttributeNS(null,u)},l.prototype.hasAttribute=function(u){return this.hasAttributeNS(null,u)},l.prototype.removeEventListener=n,l.prototype.addEventListener=r,l.prototype.dispatchEvent=a,l.prototype.focus=function(){},l.prototype.toString=function(){return s(this)},l.prototype.getElementsByClassName=function(u){var m=u.split(" "),p=[];return i(this,function(h){if(h.nodeType===1){var d=h.className||"",v=d.split(" ");m.every(function(E){return v.indexOf(E)!==-1})&&p.push(h)}}),p},l.prototype.getElementsByTagName=function(u){u=u.toLowerCase();var m=[];return i(this.childNodes,function(p){p.nodeType===1&&(u==="*"||p.tagName.toLowerCase()===u)&&m.push(p)}),m},l.prototype.contains=function(u){return i(this,function(m){return u===m})||!1}}),Xf=Ge(function(t,e){Ea();var i=Hm();e.exports=a;function a(r){if(!fa(this,a))return new a;this.childNodes=[],this.parentNode=null,this.ownerDocument=r||null}a.prototype.type="DocumentFragment",a.prototype.nodeType=11,a.prototype.nodeName="#document-fragment",a.prototype.appendChild=i.prototype.appendChild,a.prototype.replaceChild=i.prototype.replaceChild,a.prototype.removeChild=i.prototype.removeChild,a.prototype.toString=function(){return this.childNodes.map(function(r){return String(r)}).join("")}}),Jf=Ge(function(t,e){e.exports=i;function i(a){}i.prototype.initEvent=function(a,r,n){this.type=a,this.bubbles=r,this.cancelable=n},i.prototype.preventDefault=function(){}}),eE=Ge(function(t,e){Ea();var i=Nm(),a=Qf(),r=jf(),n=Hm(),s=Xf(),o=Jf(),l=Pm(),u=$m(),m=Um();e.exports=p;function p(){if(!fa(this,p))return new p;this.head=this.createElement("head"),this.body=this.createElement("body"),this.documentElement=this.createElement("html"),this.documentElement.appendChild(this.head),this.documentElement.appendChild(this.body),this.childNodes=[this.documentElement],this.nodeType=9}var h=p.prototype;h.createTextNode=function(d){return new r(d,this)},h.createElementNS=function(d,v){var E=d===null?null:String(d);return new n(v,this,E)},h.createElement=function(d){return new n(d,this)},h.createDocumentFragment=function(){return new s(this)},h.createEvent=function(d){return new o(d)},h.createComment=function(d){return new a(d,this)},h.getElementById=function(d){d=String(d);var v=i(this.childNodes,function(E){if(String(E.id)===d)return E});return v||null},h.getElementsByClassName=n.prototype.getElementsByClassName,h.getElementsByTagName=n.prototype.getElementsByTagName,h.contains=n.prototype.contains,h.removeEventListener=m,h.addEventListener=u,h.dispatchEvent=l}),tE=Ge(function(t,e){var i=eE();e.exports=new i}),Bm=Ge(function(t,e){var i=typeof global<"u"?global:typeof window<"u"?window:{},a=tE(),r;typeof document<"u"?r=document:(r=i["__GLOBAL_DOCUMENT_CACHE@4"],r||(r=i["__GLOBAL_DOCUMENT_CACHE@4"]=a)),e.exports=r});function iE(t){if(Array.isArray(t))return t}function aE(t,e){var i=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(i!=null){var a=[],r=!0,n=!1,s,o;try{for(i=i.call(t);!(r=(s=i.next()).done)&&(a.push(s.value),!(e&&a.length===e));r=!0);}catch(l){n=!0,o=l}finally{try{!r&&i.return!=null&&i.return()}finally{if(n)throw o}}return a}}function rE(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Fl(t,e){(e==null||e>t.length)&&(e=t.length);for(var i=0,a=new Array(e);i<e;i++)a[i]=t[i];return a}function Wm(t,e){if(t){if(typeof t=="string")return Fl(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);if(i==="Object"&&t.constructor&&(i=t.constructor.name),i==="Map"||i==="Set")return Array.from(i);if(i==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return Fl(t,e)}}function fi(t,e){return iE(t)||aE(t,e)||Wm(t,e)||rE()}var ln=ut(Jt()),zc=ut(Jt()),nE=ut(Jt()),sE={now:function(){var t=nE.default.performance,e=t&&t.timing,i=e&&e.navigationStart,a=typeof i=="number"&&typeof t.now=="function"?i+t.now():Date.now();return Math.round(a)}},Ce=sE,kn=function(){var t,e,i;if(typeof((t=zc.default.crypto)===null||t===void 0?void 0:t.getRandomValues)=="function"){i=new Uint8Array(32),zc.default.crypto.getRandomValues(i);for(var a=0;a<32;a++)i[a]=i[a]%16}else{i=[];for(var r=0;r<32;r++)i[r]=Math.random()*16|0}var n=0;e="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(l){var u=l==="x"?i[n]:i[n]&3|8;return n++,u.toString(16)});var s=Ce.now(),o=s?.toString(16).substring(3);return o?e.substring(0,28)+o:e},Fm=function(){return("000000"+(Math.random()*Math.pow(36,6)<<0).toString(36)).slice(-6)},ft=function(t){if(t&&typeof t.nodeName<"u")return t.muxId||(t.muxId=Fm()),t.muxId;var e;try{e=document.querySelector(t)}catch{}return e&&!e.muxId&&(e.muxId=t),e?.muxId||t},bo=function(t){var e;t&&typeof t.nodeName<"u"?(e=t,t=ft(e)):e=document.querySelector(t);var i=e&&e.nodeName?e.nodeName.toLowerCase():"";return[e,t,i]};function oE(t){if(Array.isArray(t))return Fl(t)}function lE(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function dE(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Et(t){return oE(t)||lE(t)||Wm(t)||dE()}var ra={TRACE:0,DEBUG:1,INFO:2,WARN:3,ERROR:4},uE=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:3,i,a,r,n,s,o=[console,t],l=(i=console.trace).bind.apply(i,Et(o)),u=(a=console.info).bind.apply(a,Et(o)),m=(r=console.debug).bind.apply(r,Et(o)),p=(n=console.warn).bind.apply(n,Et(o)),h=(s=console.error).bind.apply(s,Et(o)),d=e;return{trace:function(){for(var v=arguments.length,E=new Array(v),b=0;b<v;b++)E[b]=arguments[b];if(!(d>ra.TRACE))return l.apply(void 0,Et(E))},debug:function(){for(var v=arguments.length,E=new Array(v),b=0;b<v;b++)E[b]=arguments[b];if(!(d>ra.DEBUG))return m.apply(void 0,Et(E))},info:function(){for(var v=arguments.length,E=new Array(v),b=0;b<v;b++)E[b]=arguments[b];if(!(d>ra.INFO))return u.apply(void 0,Et(E))},warn:function(){for(var v=arguments.length,E=new Array(v),b=0;b<v;b++)E[b]=arguments[b];if(!(d>ra.WARN))return p.apply(void 0,Et(E))},error:function(){for(var v=arguments.length,E=new Array(v),b=0;b<v;b++)E[b]=arguments[b];if(!(d>ra.ERROR))return h.apply(void 0,Et(E))},get level(){return d},set level(v){v!==this.level&&(d=v??e)}}},te=uE("[mux]"),gl=ut(Jt());function Kl(){var t=gl.default.doNotTrack||gl.default.navigator&&gl.default.navigator.doNotTrack;return t==="1"}function P(t){if(t===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}Ea();function pe(t,e){if(!fa(t,e))throw new TypeError("Cannot call a class as a function")}function Qc(t,e){for(var i=0;i<e.length;i++){var a=e[i];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(t,a.key,a)}}function ct(t,e,i){return e&&Qc(t.prototype,e),i&&Qc(t,i),t}function w(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}function cr(t){return cr=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},cr(t)}function cE(t,e){for(;!Object.prototype.hasOwnProperty.call(t,e)&&(t=cr(t),t!==null););return t}function os(t,e,i){return typeof Reflect<"u"&&Reflect.get?os=Reflect.get:os=function(a,r,n){var s=cE(a,r);if(s){var o=Object.getOwnPropertyDescriptor(s,r);return o.get?o.get.call(n||a):o.value}},os(t,e,i||t)}function Vl(t,e){return Vl=Object.setPrototypeOf||function(i,a){return i.__proto__=a,i},Vl(t,e)}function hE(t,e){if(typeof e!="function"&&e!==null)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&Vl(t,e)}function mE(t,e){if(t==null)return{};var i={},a=Object.keys(t),r,n;for(n=0;n<a.length;n++)r=a[n],!(e.indexOf(r)>=0)&&(i[r]=t[r]);return i}function pE(t,e){if(t==null)return{};var i=mE(t,e),a,r;if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);for(r=0;r<n.length;r++)a=n[r],!(e.indexOf(a)>=0)&&Object.prototype.propertyIsEnumerable.call(t,a)&&(i[a]=t[a])}return i}function vE(){if(typeof Reflect>"u"||!Reflect.construct||Reflect.construct.sham)return!1;if(typeof Proxy=="function")return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){})),!0}catch{return!1}}xm();function fE(t,e){return e&&(Om(e)==="object"||typeof e=="function")?e:P(t)}function EE(t){var e=vE();return function(){var i=cr(t),a;if(e){var r=cr(this).constructor;a=Reflect.construct(i,arguments,r)}else a=i.apply(this,arguments);return fE(this,a)}}var kt=function(t){return Sn(t)[0]},Sn=function(t){if(typeof t!="string"||t==="")return["localhost"];var e=/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/,i=t.match(e)||[],a=i[4],r;return a&&(r=(a.match(/[^\.]+\.[^\.]+$/)||[])[0]),[a,r]},yl=ut(Jt()),_E={exists:function(){var t=yl.default.performance,e=t&&t.timing;return e!==void 0},domContentLoadedEventEnd:function(){var t=yl.default.performance,e=t&&t.timing;return e&&e.domContentLoadedEventEnd},navigationStart:function(){var t=yl.default.performance,e=t&&t.timing;return e&&e.navigationStart}},go=_E;function Se(t,e,i){i=i===void 0?1:i,t[e]=t[e]||0,t[e]+=i}function wn(t){for(var e=1;e<arguments.length;e++){var i=arguments[e]!=null?arguments[e]:{},a=Object.keys(i);typeof Object.getOwnPropertySymbols=="function"&&(a=a.concat(Object.getOwnPropertySymbols(i).filter(function(r){return Object.getOwnPropertyDescriptor(i,r).enumerable}))),a.forEach(function(r){w(t,r,i[r])})}return t}function bE(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);i.push.apply(i,a)}return i}function ou(t,e){return e=e??{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):bE(Object(e)).forEach(function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i))}),t}var gE=["x-cdn","content-type"],Km=["x-request-id","cf-ray","x-amz-cf-id","x-akamai-request-id"],yE=gE.concat(Km);function lu(t){t=t||"";var e={},i=t.trim().split(/[\r\n]+/);return i.forEach(function(a){if(a){var r=a.split(": "),n=r.shift();n&&(yE.indexOf(n.toLowerCase())>=0||n.toLowerCase().indexOf("x-litix-")===0)&&(e[n]=r.join(": "))}}),e}function yo(t){if(t){var e=Km.find(function(i){return t[i]!==void 0});return e?t[e]:void 0}}var TE=function(t){var e={};for(var i in t){var a=t[i],r=a["DATA-ID"].search("io.litix.data.");if(r!==-1){var n=a["DATA-ID"].replace("io.litix.data.","");e[n]=a.VALUE}}return e},Vm=TE,Fn=function(t){if(!t)return{};var e=go.navigationStart(),i=t.loading,a=i?i.start:t.trequest,r=i?i.first:t.tfirst,n=i?i.end:t.tload;return{bytesLoaded:t.total,requestStart:Math.round(e+a),responseStart:Math.round(e+r),responseEnd:Math.round(e+n)}},kr=function(t){if(!(!t||typeof t.getAllResponseHeaders!="function"))return lu(t.getAllResponseHeaders())},AE=function(t,e,i){var a=arguments.length>4?arguments[4]:void 0,r=t.log,n=t.utils.secondsToMs,s=function(b){var y=parseInt(a.version),T;return y===1&&b.programDateTime!==null&&(T=b.programDateTime),y===0&&b.pdt!==null&&(T=b.pdt),T};if(!go.exists()){r.warn("performance timing not supported. Not tracking HLS.js.");return}var o=function(b,y){return t.emit(e,b,y)},l=function(b,y){var T=y.levels,g=y.audioTracks,k=y.url,D=y.stats,C=y.networkDetails,$=y.sessionData,B={},G={};T.forEach(function(ve,He){B[He]={width:ve.width,height:ve.height,bitrate:ve.bitrate,attrs:ve.attrs}}),g.forEach(function(ve,He){G[He]={name:ve.name,language:ve.lang,bitrate:ve.bitrate}});var W=Fn(D),U=W.bytesLoaded,Ne=W.requestStart,ze=W.responseStart,Qe=W.responseEnd;o("requestcompleted",ou(wn({},Vm($)),{request_event_type:b,request_bytes_loaded:U,request_start:Ne,request_response_start:ze,request_response_end:Qe,request_type:"manifest",request_hostname:kt(k),request_response_headers:kr(C),request_rendition_lists:{media:B,audio:G,video:{}}}))};i.on(a.Events.MANIFEST_LOADED,l);var u=function(b,y){var T=y.details,g=y.level,k=y.networkDetails,D=y.stats,C=Fn(D),$=C.bytesLoaded,B=C.requestStart,G=C.responseStart,W=C.responseEnd,U=T.fragments[T.fragments.length-1],Ne=s(U)+n(U.duration);o("requestcompleted",{request_event_type:b,request_bytes_loaded:$,request_start:B,request_response_start:G,request_response_end:W,request_current_level:g,request_type:"manifest",request_hostname:kt(T.url),request_response_headers:kr(k),video_holdback:T.holdBack&&n(T.holdBack),video_part_holdback:T.partHoldBack&&n(T.partHoldBack),video_part_target_duration:T.partTarget&&n(T.partTarget),video_target_duration:T.targetduration&&n(T.targetduration),video_source_is_live:T.live,player_manifest_newest_program_time:isNaN(Ne)?void 0:Ne})};i.on(a.Events.LEVEL_LOADED,u);var m=function(b,y){var T=y.details,g=y.networkDetails,k=y.stats,D=Fn(k),C=D.bytesLoaded,$=D.requestStart,B=D.responseStart,G=D.responseEnd;o("requestcompleted",{request_event_type:b,request_bytes_loaded:C,request_start:$,request_response_start:B,request_response_end:G,request_type:"manifest",request_hostname:kt(T.url),request_response_headers:kr(g)})};i.on(a.Events.AUDIO_TRACK_LOADED,m);var p=function(b,y){var T=y.stats,g=y.networkDetails,k=y.frag;T=T||k.stats;var D=Fn(T),C=D.bytesLoaded,$=D.requestStart,B=D.responseStart,G=D.responseEnd,W=g?kr(g):void 0,U={request_event_type:b,request_bytes_loaded:C,request_start:$,request_response_start:B,request_response_end:G,request_hostname:g?kt(g.responseURL):void 0,request_id:W?yo(W):void 0,request_response_headers:W,request_media_duration:k.duration,request_url:g?.responseURL};k.type==="main"?(U.request_type="media",U.request_current_level=k.level,U.request_video_width=(i.levels[k.level]||{}).width,U.request_video_height=(i.levels[k.level]||{}).height,U.request_labeled_bitrate=(i.levels[k.level]||{}).bitrate):U.request_type=k.type,o("requestcompleted",U)};i.on(a.Events.FRAG_LOADED,p);var h=function(b,y){var T=y.frag,g=T.start,k=s(T),D={currentFragmentPDT:k,currentFragmentStart:n(g)};o("fragmentchange",D)};i.on(a.Events.FRAG_CHANGED,h);var d=function(b,y){var T=y.type,g=y.details,k=y.response,D=y.fatal,C=y.frag,$=y.networkDetails,B=C?.url||y.url||"",G=$?kr($):void 0;if((g===a.ErrorDetails.MANIFEST_LOAD_ERROR||g===a.ErrorDetails.MANIFEST_LOAD_TIMEOUT||g===a.ErrorDetails.FRAG_LOAD_ERROR||g===a.ErrorDetails.FRAG_LOAD_TIMEOUT||g===a.ErrorDetails.LEVEL_LOAD_ERROR||g===a.ErrorDetails.LEVEL_LOAD_TIMEOUT||g===a.ErrorDetails.AUDIO_TRACK_LOAD_ERROR||g===a.ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT||g===a.ErrorDetails.SUBTITLE_LOAD_ERROR||g===a.ErrorDetails.SUBTITLE_LOAD_TIMEOUT||g===a.ErrorDetails.KEY_LOAD_ERROR||g===a.ErrorDetails.KEY_LOAD_TIMEOUT)&&o("requestfailed",{request_error:g,request_url:B,request_hostname:kt(B),request_id:G?yo(G):void 0,request_type:g===a.ErrorDetails.FRAG_LOAD_ERROR||g===a.ErrorDetails.FRAG_LOAD_TIMEOUT?"media":g===a.ErrorDetails.AUDIO_TRACK_LOAD_ERROR||g===a.ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT?"audio":g===a.ErrorDetails.SUBTITLE_LOAD_ERROR||g===a.ErrorDetails.SUBTITLE_LOAD_TIMEOUT?"subtitle":g===a.ErrorDetails.KEY_LOAD_ERROR||g===a.ErrorDetails.KEY_LOAD_TIMEOUT?"encryption":"manifest",request_error_code:k?.code,request_error_text:k?.text}),D){var W,U="".concat(B?"url: ".concat(B,`
`):"")+"".concat(k&&(k.code||k.text)?"response: ".concat(k.code,", ").concat(k.text,`
`):"")+"".concat(y.reason?"failure reason: ".concat(y.reason,`
`):"")+"".concat(y.level?"level: ".concat(y.level,`
`):"")+"".concat(y.parent?"parent stream controller: ".concat(y.parent,`
`):"")+"".concat(y.buffer?"buffer length: ".concat(y.buffer,`
`):"")+"".concat(y.error?"error: ".concat(y.error,`
`):"")+"".concat(y.event?"event: ".concat(y.event,`
`):"")+"".concat(y.err?"error message: ".concat((W=y.err)===null||W===void 0?void 0:W.message,`
`):"");o("error",{player_error_code:T,player_error_message:g,player_error_context:U})}};i.on(a.Events.ERROR,d);var v=function(b,y){var T=y.frag,g=T&&T._url||"";o("requestcanceled",{request_event_type:b,request_url:g,request_type:"media",request_hostname:kt(g)})};i.on(a.Events.FRAG_LOAD_EMERGENCY_ABORTED,v);var E=function(b,y){var T=y.level,g=i.levels[T];if(g&&g.attrs&&g.attrs.BANDWIDTH){var k=g.attrs.BANDWIDTH,D,C=parseFloat(g.attrs["FRAME-RATE"]);isNaN(C)||(D=C),k?o("renditionchange",{video_source_fps:D,video_source_bitrate:k,video_source_width:g.width,video_source_height:g.height,video_source_rendition_name:g.name,video_source_codec:g?.videoCodec}):r.warn("missing BANDWIDTH from HLS manifest parsed by HLS.js")}};i.on(a.Events.LEVEL_SWITCHED,E),i._stopMuxMonitor=function(){i.off(a.Events.MANIFEST_LOADED,l),i.off(a.Events.LEVEL_LOADED,u),i.off(a.Events.AUDIO_TRACK_LOADED,m),i.off(a.Events.FRAG_LOADED,p),i.off(a.Events.FRAG_CHANGED,h),i.off(a.Events.ERROR,d),i.off(a.Events.FRAG_LOAD_EMERGENCY_ABORTED,v),i.off(a.Events.LEVEL_SWITCHED,E),i.off(a.Events.DESTROYING,i._stopMuxMonitor),delete i._stopMuxMonitor},i.on(a.Events.DESTROYING,i._stopMuxMonitor)},kE=function(t){t&&typeof t._stopMuxMonitor=="function"&&t._stopMuxMonitor()},jc=function(t,e){if(!t||!t.requestEndDate)return{};var i=kt(t.url),a=t.url,r=t.bytesLoaded,n=new Date(t.requestStartDate).getTime(),s=new Date(t.firstByteDate).getTime(),o=new Date(t.requestEndDate).getTime(),l=isNaN(t.duration)?0:t.duration,u=typeof e.getMetricsFor=="function"?e.getMetricsFor(t.mediaType).HttpList:e.getDashMetrics().getHttpRequests(t.mediaType),m;u.length>0&&(m=lu(u[u.length-1]._responseHeaders||""));var p=m?yo(m):void 0;return{requestStart:n,requestResponseStart:s,requestResponseEnd:o,requestBytesLoaded:r,requestResponseHeaders:m,requestMediaDuration:l,requestHostname:i,requestUrl:a,requestId:p}},SE=function(t,e){if(typeof e.getCurrentRepresentationForType=="function"){var i=e.getCurrentRepresentationForType(t);return i?{currentLevel:i.absoluteIndex,renditionWidth:i.width||null,renditionHeight:i.height||null,renditionBitrate:i.bandwidth}:{}}var a=e.getQualityFor(t),r=e.getCurrentTrackFor(t).bitrateList;return r?{currentLevel:a,renditionWidth:r[a].width||null,renditionHeight:r[a].height||null,renditionBitrate:r[a].bandwidth}:{}},wE=function(t){var e;return(e=t.match(/.*codecs\*?="(.*)"/))===null||e===void 0?void 0:e[1]},IE=function(t){try{var e,i,a=(i=t.getVersion)===null||i===void 0||(e=i.call(t))===null||e===void 0?void 0:e.split(".").map(function(r){return parseInt(r)})[0];return a}catch{return!1}},RE=function(t,e,i){var a=t.log;if(!i||!i.on){a.warn("Invalid dash.js player reference. Monitoring blocked.");return}var r=IE(i),n=function(T,g){return t.emit(e,T,g)},s=function(T){var g=T.type,k=T.data,D=(k||{}).url;n("requestcompleted",{request_event_type:g,request_start:0,request_response_start:0,request_response_end:0,request_bytes_loaded:-1,request_type:"manifest",request_hostname:kt(D),request_url:D})};i.on("manifestLoaded",s);var o={},l=function(T){if(typeof T.getRequests!="function")return null;var g=T.getRequests({state:"executed"});return g.length===0?null:g[g.length-1]},u=function(T){var g=T.type,k=T.fragmentModel,D=T.chunk,C=l(k);m({type:g,request:C,chunk:D})},m=function(T){var g=T.type,k=T.chunk,D=T.request,C=(k||{}).mediaInfo,$=C||{},B=$.type,G=$.bitrateList;G=G||[];var W={};G.forEach(function(je,we){W[we]={},W[we].width=je.width,W[we].height=je.height,W[we].bitrate=je.bandwidth,W[we].attrs={}}),B==="video"?o.video=W:B==="audio"?o.audio=W:o.media=W;var U=jc(D,i),Ne=U.requestStart,ze=U.requestResponseStart,Qe=U.requestResponseEnd,ve=U.requestResponseHeaders,He=U.requestMediaDuration,Rt=U.requestHostname,Be=U.requestUrl,mt=U.requestId;n("requestcompleted",{request_event_type:g,request_start:Ne,request_response_start:ze,request_response_end:Qe,request_bytes_loaded:-1,request_type:B+"_init",request_response_headers:ve,request_hostname:Rt,request_id:mt,request_url:Be,request_media_duration:He,request_rendition_lists:o})};r>=4?i.on("initFragmentLoaded",m):i.on("initFragmentLoaded",u);var p=function(T){var g=T.type,k=T.fragmentModel,D=T.chunk,C=l(k);h({type:g,request:C,chunk:D})},h=function(T){var g=T.type,k=T.chunk,D=T.request,C=k||{},$=C.mediaInfo,B=C.start,G=$||{},W=G.type,U=jc(D,i),Ne=U.requestStart,ze=U.requestResponseStart,Qe=U.requestResponseEnd,ve=U.requestBytesLoaded,He=U.requestResponseHeaders,Rt=U.requestMediaDuration,Be=U.requestHostname,mt=U.requestUrl,je=U.requestId,we=SE(W,i),Pe=we.currentLevel,We=we.renditionWidth,ei=we.renditionHeight,Vi=we.renditionBitrate;n("requestcompleted",{request_event_type:g,request_start:Ne,request_response_start:ze,request_response_end:Qe,request_bytes_loaded:ve,request_type:W,request_response_headers:He,request_hostname:Be,request_id:je,request_url:mt,request_media_start_time:B,request_media_duration:Rt,request_current_level:Pe,request_labeled_bitrate:Vi,request_video_width:We,request_video_height:ei})};r>=4?i.on("mediaFragmentLoaded",h):i.on("mediaFragmentLoaded",p);var d={video:void 0,audio:void 0,totalBitrate:void 0},v=function(){if(d.video&&typeof d.video.bitrate=="number"){if(!(d.video.width&&d.video.height)){a.warn("have bitrate info for video but missing width/height");return}var T=d.video.bitrate;if(d.audio&&typeof d.audio.bitrate=="number"&&(T+=d.audio.bitrate),T!==d.totalBitrate)return d.totalBitrate=T,{video_source_bitrate:T,video_source_height:d.video.height,video_source_width:d.video.width,video_source_codec:wE(d.video.codec)}}},E=function(T,g,k){var D=T.mediaType;if(D==="audio"||D==="video"){var C;if(typeof i.getRepresentationsByType=="function")if(T.newRepresentation)C={bitrate:T.newRepresentation.bandwidth,width:T.newRepresentation.width,height:T.newRepresentation.height,qualityIndex:T.newRepresentation.absoluteIndex};else{var $=i.getRepresentationsByType(D);if($&&typeof T.newQuality=="number"){var B=$.find(function(W){return W.absoluteIndex===T.newQuality||W.index===T.newQuality});B&&(C={bitrate:B.bandwidth,width:B.width,height:B.height,qualityIndex:T.newQuality})}}else{if(typeof T.newQuality!="number"){a.warn("missing evt.newQuality in qualityChangeRendered event",T);return}C=i.getBitrateInfoListFor(D).find(function(W){var U=W.qualityIndex;return U===T.newQuality})}if(!(C&&typeof C.bitrate=="number")){a.warn("missing bitrate info for ".concat(D));return}d[D]=ou(wn({},C),{codec:i.getCurrentTrackFor(D).codec});var G=v();G&&n("renditionchange",G)}};i.on("qualityChangeRendered",E);var b=function(T){var g=T.request,k=T.mediaType;g=g||{},n("requestcanceled",{request_event_type:g.type+"_"+g.action,request_url:g.url,request_type:k,request_hostname:kt(g.url)})};i.on("fragmentLoadingAbandoned",b);var y=function(T){var g=T.error,k,D,C=(g==null||(k=g.data)===null||k===void 0?void 0:k.request)||{},$=(g==null||(D=g.data)===null||D===void 0?void 0:D.response)||{};g?.code===27&&n("requestfailed",{request_error:C.type+"_"+C.action,request_url:C.url,request_hostname:kt(C.url),request_type:C.mediaType,request_error_code:$.status,request_error_text:$.statusText});var B="".concat(C!=null&&C.url?"url: ".concat(C.url,`
`):"")+"".concat($!=null&&$.status||$!=null&&$.statusText?"response: ".concat($?.status,", ").concat($?.statusText,`
`):"");n("error",{player_error_code:g?.code,player_error_message:g?.message,player_error_context:B})};i.on("error",y),i._stopMuxMonitor=function(){i.off("manifestLoaded",s),i.off("initFragmentLoaded",m),i.off("mediaFragmentLoaded",h),i.off("qualityChangeRendered",E),i.off("error",y),i.off("fragmentLoadingAbandoned",b),delete i._stopMuxMonitor}},LE=function(t){t&&typeof t._stopMuxMonitor=="function"&&t._stopMuxMonitor()},Zc=0,CE=(function(){function t(){pe(this,t),w(this,"_listeners",void 0)}return ct(t,[{key:"on",value:function(e,i,a){return i._eventEmitterGuid=i._eventEmitterGuid||++Zc,this._listeners=this._listeners||{},this._listeners[e]=this._listeners[e]||[],a&&(i=i.bind(a)),this._listeners[e].push(i),i}},{key:"off",value:function(e,i){var a=this._listeners&&this._listeners[e];a&&a.forEach(function(r,n){r._eventEmitterGuid===i._eventEmitterGuid&&a.splice(n,1)})}},{key:"one",value:function(e,i,a){var r=this;i._eventEmitterGuid=i._eventEmitterGuid||++Zc;var n=function(){r.off(e,n),i.apply(a||this,arguments)};n._eventEmitterGuid=i._eventEmitterGuid,this.on(e,n)}},{key:"emit",value:function(e,i){var a=this;if(this._listeners){i=i||{};var r=this._listeners["before"+e]||[],n=this._listeners["before*"]||[],s=this._listeners[e]||[],o=this._listeners["after"+e]||[],l=function(u,m){u=u.slice(),u.forEach(function(p){p.call(a,{type:e},m)})};l(r,i),l(n,i),l(s,i),l(o,i)}}}]),t})(),DE=CE,Tl=ut(Jt()),ME=(function(){function t(e){var i=this;pe(this,t),w(this,"_playbackHeartbeatInterval",void 0),w(this,"_playheadShouldBeProgressing",void 0),w(this,"pm",void 0),this.pm=e,this._playbackHeartbeatInterval=null,this._playheadShouldBeProgressing=!1,e.on("playing",function(){i._playheadShouldBeProgressing=!0}),e.on("play",this._startPlaybackHeartbeatInterval.bind(this)),e.on("playing",this._startPlaybackHeartbeatInterval.bind(this)),e.on("adbreakstart",this._startPlaybackHeartbeatInterval.bind(this)),e.on("adplay",this._startPlaybackHeartbeatInterval.bind(this)),e.on("adplaying",this._startPlaybackHeartbeatInterval.bind(this)),e.on("devicewake",this._startPlaybackHeartbeatInterval.bind(this)),e.on("viewstart",this._startPlaybackHeartbeatInterval.bind(this)),e.on("rebufferstart",this._startPlaybackHeartbeatInterval.bind(this)),e.on("pause",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("ended",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("viewend",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("error",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("aderror",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("adpause",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("adended",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("adbreakend",this._stopPlaybackHeartbeatInterval.bind(this)),e.on("seeked",function(){e.data.player_is_paused?i._stopPlaybackHeartbeatInterval():i._startPlaybackHeartbeatInterval()}),e.on("timeupdate",function(){i._playbackHeartbeatInterval!==null&&e.emit("playbackheartbeat")}),e.on("devicesleep",function(a,r){i._playbackHeartbeatInterval!==null&&(Tl.default.clearInterval(i._playbackHeartbeatInterval),e.emit("playbackheartbeatend",{viewer_time:r.viewer_time}),i._playbackHeartbeatInterval=null)})}return ct(t,[{key:"_startPlaybackHeartbeatInterval",value:function(){var e=this;this._playbackHeartbeatInterval===null&&(this.pm.emit("playbackheartbeat"),this._playbackHeartbeatInterval=Tl.default.setInterval(function(){e.pm.emit("playbackheartbeat")},this.pm.playbackHeartbeatTime))}},{key:"_stopPlaybackHeartbeatInterval",value:function(){this._playheadShouldBeProgressing=!1,this._playbackHeartbeatInterval!==null&&(Tl.default.clearInterval(this._playbackHeartbeatInterval),this.pm.emit("playbackheartbeatend"),this._playbackHeartbeatInterval=null)}}]),t})(),OE=ME,xE=function t(e){var i=this;pe(this,t),w(this,"viewErrored",void 0),e.on("viewinit",function(){i.viewErrored=!1}),e.on("error",function(a,r){try{var n=e.errorTranslator({player_error_code:r.player_error_code,player_error_message:r.player_error_message,player_error_context:r.player_error_context,player_error_severity:r.player_error_severity,player_error_business_exception:r.player_error_business_exception});n&&(e.data.player_error_code=n.player_error_code||r.player_error_code,e.data.player_error_message=n.player_error_message||r.player_error_message,e.data.player_error_context=n.player_error_context||r.player_error_context,e.data.player_error_severity=n.player_error_severity||r.player_error_severity,e.data.player_error_business_exception=n.player_error_business_exception||r.player_error_business_exception,i.viewErrored=!0)}catch(s){e.mux.log.warn("Exception in error translator callback.",s),i.viewErrored=!0}}),e.on("aftererror",function(){var a,r,n,s,o;(a=e.data)===null||a===void 0||delete a.player_error_code,(r=e.data)===null||r===void 0||delete r.player_error_message,(n=e.data)===null||n===void 0||delete n.player_error_context,(s=e.data)===null||s===void 0||delete s.player_error_severity,(o=e.data)===null||o===void 0||delete o.player_error_business_exception})},NE=xE,PE=(function(){function t(e){pe(this,t),w(this,"_watchTimeTrackerLastCheckedTime",void 0),w(this,"pm",void 0),this.pm=e,this._watchTimeTrackerLastCheckedTime=null,e.on("playbackheartbeat",this._updateWatchTime.bind(this)),e.on("playbackheartbeatend",this._clearWatchTimeState.bind(this))}return ct(t,[{key:"_updateWatchTime",value:function(e,i){var a=i.viewer_time;this._watchTimeTrackerLastCheckedTime===null&&(this._watchTimeTrackerLastCheckedTime=a),Se(this.pm.data,"view_watch_time",a-this._watchTimeTrackerLastCheckedTime),this._watchTimeTrackerLastCheckedTime=a}},{key:"_clearWatchTimeState",value:function(e,i){this._updateWatchTime(e,i),this._watchTimeTrackerLastCheckedTime=null}}]),t})(),$E=PE,UE=(function(){function t(e){var i=this;pe(this,t),w(this,"_playbackTimeTrackerLastPlayheadPosition",void 0),w(this,"_lastTime",void 0),w(this,"_isAdPlaying",void 0),w(this,"_callbackUpdatePlaybackTime",void 0),w(this,"pm",void 0),this.pm=e,this._playbackTimeTrackerLastPlayheadPosition=-1,this._lastTime=Ce.now(),this._isAdPlaying=!1,this._callbackUpdatePlaybackTime=null,e.on("viewinit",function(){i.pm.data.view_playing_time_ms_cumulative=0});var a=this._startPlaybackTimeTracking.bind(this);e.on("playing",a),e.on("adplaying",a);var r=function(){i.pm.data.player_is_paused||a()};e.on("seeked",r),e.on("rebufferend",r);var n=this._stopPlaybackTimeTracking.bind(this);e.on("playbackheartbeatend",n),e.on("seeking",n),e.on("rebufferstart",n),e.on("adplaying",function(){i._isAdPlaying=!0}),e.on("adended",function(){i._isAdPlaying=!1}),e.on("adpause",function(){i._isAdPlaying=!1}),e.on("adbreakstart",function(){i._isAdPlaying=!1}),e.on("adbreakend",function(){i._isAdPlaying=!1}),e.on("adplay",function(){i._isAdPlaying=!1}),e.on("viewinit",function(){i._playbackTimeTrackerLastPlayheadPosition=-1,i._lastTime=Ce.now(),i._isAdPlaying=!1,i._callbackUpdatePlaybackTime=null})}return ct(t,[{key:"_startPlaybackTimeTracking",value:function(){this._callbackUpdatePlaybackTime===null&&(this._callbackUpdatePlaybackTime=this._updatePlaybackTime.bind(this),this._playbackTimeTrackerLastPlayheadPosition=this.pm.data.player_playhead_time,this._lastTime=Ce.now(),this.pm.on("playbackheartbeat",this._callbackUpdatePlaybackTime))}},{key:"_stopPlaybackTimeTracking",value:function(){this._callbackUpdatePlaybackTime&&(this._updatePlaybackTime(),this.pm.off("playbackheartbeat",this._callbackUpdatePlaybackTime),this._callbackUpdatePlaybackTime=null,this._playbackTimeTrackerLastPlayheadPosition=-1)}},{key:"_updatePlaybackTime",value:function(){var e=this.pm.data.player_playhead_time||0,i=Ce.now(),a=i-this._lastTime,r=-1;this._playbackTimeTrackerLastPlayheadPosition>=0&&e>this._playbackTimeTrackerLastPlayheadPosition?r=e-this._playbackTimeTrackerLastPlayheadPosition:this._isAdPlaying&&(r=a),r>0&&r<=1e3&&Se(this.pm.data,"view_content_playback_time",r),this._callbackUpdatePlaybackTime!==null&&a>0&&a<=1e3&&(this._isAdPlaying&&Se(this.pm.data,"ad_playing_time_ms_cumulative",a),Se(this.pm.data,"view_playing_time_ms_cumulative",a)),this._playbackTimeTrackerLastPlayheadPosition=e,this._lastTime=i}}]),t})(),HE=UE,BE=(function(){function t(e){pe(this,t),w(this,"pm",void 0),this.pm=e;var i=this._updatePlayheadTime.bind(this);e.on("playbackheartbeat",i),e.on("playbackheartbeatend",i),e.on("timeupdate",i),e.on("destroy",function(){e.off("timeupdate",i)})}return ct(t,[{key:"_updateMaxPlayheadPosition",value:function(){this.pm.data.view_max_playhead_position=typeof this.pm.data.view_max_playhead_position>"u"?this.pm.data.player_playhead_time:Math.max(this.pm.data.view_max_playhead_position,this.pm.data.player_playhead_time)}},{key:"_updatePlayheadTime",value:function(e,i){var a=this,r=function(){a.pm.currentFragmentPDT&&a.pm.currentFragmentStart&&(a.pm.data.player_program_time=a.pm.currentFragmentPDT+a.pm.data.player_playhead_time-a.pm.currentFragmentStart)};if(i&&i.player_playhead_time)this.pm.data.player_playhead_time=i.player_playhead_time,r(),this._updateMaxPlayheadPosition();else if(this.pm.getPlayheadTime){var n=this.pm.getPlayheadTime();typeof n<"u"&&(this.pm.data.player_playhead_time=n,r(),this._updateMaxPlayheadPosition())}}}]),t})(),WE=BE,Xc=300*1e3,FE=function t(e){if(pe(this,t),!e.disableRebufferTracking){var i,a=function(n,s){r(s),i=void 0},r=function(n){if(i){var s=n.viewer_time-i;Se(e.data,"view_rebuffer_duration",s),i=n.viewer_time,e.data.view_rebuffer_duration>Xc&&(e.emit("viewend"),e.send("viewend"),e.mux.log.warn("Ending view after rebuffering for longer than ".concat(Xc,"ms, future events will be ignored unless a programchange or videochange occurs.")))}e.data.view_watch_time>=0&&e.data.view_rebuffer_count>0&&(e.data.view_rebuffer_frequency=e.data.view_rebuffer_count/e.data.view_watch_time,e.data.view_rebuffer_percentage=e.data.view_rebuffer_duration/e.data.view_watch_time)};e.on("playbackheartbeat",function(n,s){return r(s)}),e.on("rebufferstart",function(n,s){i||(Se(e.data,"view_rebuffer_count",1),i=s.viewer_time,e.one("rebufferend",a))}),e.on("viewinit",function(){i=void 0,e.off("rebufferend",a)})}},KE=FE,VE=(function(){function t(e){var i=this;pe(this,t),w(this,"_lastCheckedTime",void 0),w(this,"_lastPlayheadTime",void 0),w(this,"_lastPlayheadTimeUpdatedTime",void 0),w(this,"_rebuffering",void 0),w(this,"pm",void 0),this.pm=e,!(e.disableRebufferTracking||e.disablePlayheadRebufferTracking)&&(this._lastCheckedTime=null,this._lastPlayheadTime=null,this._lastPlayheadTimeUpdatedTime=null,e.on("playbackheartbeat",this._checkIfRebuffering.bind(this)),e.on("playbackheartbeatend",this._cleanupRebufferTracker.bind(this)),e.on("seeking",function(){i._cleanupRebufferTracker(null,{viewer_time:Ce.now()})}))}return ct(t,[{key:"_checkIfRebuffering",value:function(e,i){if(this.pm.seekingTracker.isSeeking||this.pm.adTracker.isAdBreak||!this.pm.playbackHeartbeat._playheadShouldBeProgressing){this._cleanupRebufferTracker(e,i);return}if(this._lastCheckedTime===null){this._prepareRebufferTrackerState(i.viewer_time);return}if(this._lastPlayheadTime!==this.pm.data.player_playhead_time){this._cleanupRebufferTracker(e,i,!0);return}var a=i.viewer_time-this._lastPlayheadTimeUpdatedTime;typeof this.pm.sustainedRebufferThreshold=="number"&&a>=this.pm.sustainedRebufferThreshold&&(this._rebuffering||(this._rebuffering=!0,this.pm.emit("rebufferstart",{viewer_time:this._lastPlayheadTimeUpdatedTime}))),this._lastCheckedTime=i.viewer_time}},{key:"_clearRebufferTrackerState",value:function(){this._lastCheckedTime=null,this._lastPlayheadTime=null,this._lastPlayheadTimeUpdatedTime=null}},{key:"_prepareRebufferTrackerState",value:function(e){this._lastCheckedTime=e,this._lastPlayheadTime=this.pm.data.player_playhead_time,this._lastPlayheadTimeUpdatedTime=e}},{key:"_cleanupRebufferTracker",value:function(e,i){var a=arguments.length>2&&arguments[2]!==void 0?arguments[2]:!1;if(this._rebuffering)this._rebuffering=!1,this.pm.emit("rebufferend",{viewer_time:i.viewer_time});else{if(this._lastCheckedTime===null)return;var r=this.pm.data.player_playhead_time-this._lastPlayheadTime,n=i.viewer_time-this._lastPlayheadTimeUpdatedTime;typeof this.pm.minimumRebufferDuration=="number"&&r>0&&n-r>this.pm.minimumRebufferDuration&&(this._lastCheckedTime=null,this.pm.emit("rebufferstart",{viewer_time:this._lastPlayheadTimeUpdatedTime}),this.pm.emit("rebufferend",{viewer_time:this._lastPlayheadTimeUpdatedTime+n-r}))}a?this._prepareRebufferTrackerState(i.viewer_time):this._clearRebufferTrackerState()}}]),t})(),qE=VE,YE=(function(){function t(e){var i=this;pe(this,t),w(this,"pm",void 0),this.pm=e,e.on("viewinit",function(){var a=e.data,r=a.view_id;if(!a.view_program_changed){var n=function(s,o){var l=o.viewer_time;(s.type==="playing"&&typeof e.data.view_time_to_first_frame>"u"||s.type==="adplaying"&&(typeof e.data.view_time_to_first_frame>"u"||i._inPrerollPosition()))&&i.calculateTimeToFirstFrame(l||Ce.now(),r)};e.one("playing",n),e.one("adplaying",n),e.one("viewend",function(){e.off("playing",n),e.off("adplaying",n)})}})}return ct(t,[{key:"_inPrerollPosition",value:function(){return typeof this.pm.data.view_content_playback_time>"u"||this.pm.data.view_content_playback_time<=1e3}},{key:"calculateTimeToFirstFrame",value:function(e,i){i===this.pm.data.view_id&&(this.pm.watchTimeTracker._updateWatchTime(null,{viewer_time:e}),this.pm.data.view_time_to_first_frame=this.pm.data.view_watch_time,(this.pm.data.player_autoplay_on||this.pm.data.video_is_autoplay)&&this.pm.pageLoadInitTime&&(this.pm.data.view_aggregate_startup_time=this.pm.data.view_start+this.pm.data.view_watch_time-this.pm.pageLoadInitTime))}}]),t})(),GE=YE,zE=function t(e){var i=this;pe(this,t),w(this,"_lastPlayerHeight",void 0),w(this,"_lastPlayerWidth",void 0),w(this,"_lastPlayheadPosition",void 0),w(this,"_lastSourceHeight",void 0),w(this,"_lastSourceWidth",void 0),e.on("viewinit",function(){i._lastPlayheadPosition=-1});var a=["pause","rebufferstart","seeking","error","adbreakstart","hb","renditionchange","orientationchange","viewend","playbackmodechange"],r=["playing","hb","renditionchange","orientationchange","playbackmodechange"];a.forEach(function(n){e.on(n,function(){if(i._lastPlayheadPosition>=0&&e.data.player_playhead_time>=0&&i._lastPlayerWidth>=0&&i._lastSourceWidth>0&&i._lastPlayerHeight>=0&&i._lastSourceHeight>0){var s=e.data.player_playhead_time-i._lastPlayheadPosition;if(s<0){i._lastPlayheadPosition=-1;return}var o=Math.min(i._lastPlayerWidth/i._lastSourceWidth,i._lastPlayerHeight/i._lastSourceHeight),l=Math.max(0,o-1),u=Math.max(0,1-o);e.data.view_max_upscale_percentage=Math.max(e.data.view_max_upscale_percentage||0,l),e.data.view_max_downscale_percentage=Math.max(e.data.view_max_downscale_percentage||0,u),Se(e.data,"view_total_content_playback_time",s),Se(e.data,"view_total_upscaling",l*s),Se(e.data,"view_total_downscaling",u*s)}i._lastPlayheadPosition=-1})}),r.forEach(function(n){e.on(n,function(){i._lastPlayheadPosition=e.data.player_playhead_time,i._lastPlayerWidth=e.data.player_width,i._lastPlayerHeight=e.data.player_height,i._lastSourceWidth=e.data.video_source_width,i._lastSourceHeight=e.data.video_source_height})})},QE=zE,jE=2e3,ZE=function t(e){var i=this;pe(this,t),w(this,"isSeeking",void 0),this.isSeeking=!1;var a=-1,r=function(){var n=Ce.now(),s=(e.data.viewer_time||n)-(a||n);Se(e.data,"view_seek_duration",s),e.data.view_max_seek_time=Math.max(e.data.view_max_seek_time||0,s),i.isSeeking=!1,a=-1};e.on("seeking",function(n,s){if(Object.assign(e.data,s),i.isSeeking&&s.viewer_time-a<=jE){a=s.viewer_time;return}i.isSeeking&&r(),i.isSeeking=!0,a=s.viewer_time,Se(e.data,"view_seek_count",1),e.send("seeking")}),e.on("seeked",function(){r()}),e.on("viewend",function(){i.isSeeking&&(r(),e.send("seeked")),i.isSeeking=!1,a=-1})},XE=ZE,Jc=function(t,e){t.push(e),t.sort(function(i,a){return i.viewer_time-a.viewer_time})},JE=["adbreakstart","adrequest","adresponse","adplay","adplaying","adpause","adended","adbreakend","aderror","adclicked","adskipped"],e_=(function(){function t(e){var i=this;pe(this,t),w(this,"_adHasPlayed",void 0),w(this,"_adRequests",void 0),w(this,"_adResponses",void 0),w(this,"_currentAdRequestNumber",void 0),w(this,"_currentAdResponseNumber",void 0),w(this,"_prerollPlayTime",void 0),w(this,"_wouldBeNewAdPlay",void 0),w(this,"isAdBreak",void 0),w(this,"pm",void 0),this.pm=e,e.on("viewinit",function(){i.isAdBreak=!1,i._currentAdRequestNumber=0,i._currentAdResponseNumber=0,i._adRequests=[],i._adResponses=[],i._adHasPlayed=!1,i._wouldBeNewAdPlay=!0,i._prerollPlayTime=void 0}),JE.forEach(function(r){return e.on(r,i._updateAdData.bind(i))});var a=function(){i.isAdBreak=!1};e.on("adbreakstart",function(){i.isAdBreak=!0}),e.on("play",a),e.on("playing",a),e.on("viewend",a),e.on("adrequest",function(r,n){n=Object.assign({ad_request_id:"generatedAdRequestId"+i._currentAdRequestNumber++},n),Jc(i._adRequests,n),Se(e.data,"view_ad_request_count"),i.inPrerollPosition()&&(e.data.view_preroll_requested=!0,i._adHasPlayed||Se(e.data,"view_preroll_request_count"))}),e.on("adresponse",function(r,n){n=Object.assign({ad_request_id:"generatedAdRequestId"+i._currentAdResponseNumber++},n),Jc(i._adResponses,n);var s=i.findAdRequest(n.ad_request_id);s&&Se(e.data,"view_ad_request_time",Math.max(0,n.viewer_time-s.viewer_time))}),e.on("adplay",function(r,n){i._adHasPlayed=!0,i._wouldBeNewAdPlay&&(i._wouldBeNewAdPlay=!1,Se(e.data,"view_ad_played_count")),i.inPrerollPosition()&&!e.data.view_preroll_played&&(e.data.view_preroll_played=!0,i._adRequests.length>0&&(e.data.view_preroll_request_time=Math.max(0,n.viewer_time-i._adRequests[0].viewer_time)),e.data.view_start&&(e.data.view_startup_preroll_request_time=Math.max(0,n.viewer_time-e.data.view_start)),i._prerollPlayTime=n.viewer_time)}),e.on("adplaying",function(r,n){i.inPrerollPosition()&&typeof e.data.view_preroll_load_time>"u"&&typeof i._prerollPlayTime<"u"&&(e.data.view_preroll_load_time=n.viewer_time-i._prerollPlayTime,e.data.view_startup_preroll_load_time=n.viewer_time-i._prerollPlayTime)}),e.on("adclicked",function(r,n){i._wouldBeNewAdPlay||Se(e.data,"view_ad_clicked_count")}),e.on("adskipped",function(r,n){i._wouldBeNewAdPlay||Se(e.data,"view_ad_skipped_count")}),e.on("adended",function(){i._wouldBeNewAdPlay=!0}),e.on("aderror",function(){i._wouldBeNewAdPlay=!0})}return ct(t,[{key:"inPrerollPosition",value:function(){return typeof this.pm.data.view_content_playback_time>"u"||this.pm.data.view_content_playback_time<=1e3}},{key:"findAdRequest",value:function(e){for(var i=0;i<this._adRequests.length;i++)if(this._adRequests[i].ad_request_id===e)return this._adRequests[i]}},{key:"_updateAdData",value:function(e,i){if(this.inPrerollPosition()){if(!this.pm.data.view_preroll_ad_tag_hostname&&i.ad_tag_url){var a=fi(Sn(i.ad_tag_url),2),r=a[0],n=a[1];this.pm.data.view_preroll_ad_tag_domain=n,this.pm.data.view_preroll_ad_tag_hostname=r}if(!this.pm.data.view_preroll_ad_asset_hostname&&i.ad_asset_url){var s=fi(Sn(i.ad_asset_url),2),o=s[0],l=s[1];this.pm.data.view_preroll_ad_asset_domain=l,this.pm.data.view_preroll_ad_asset_hostname=o}this.pm.data.ad_type="preroll"}this.pm.data.ad_asset_url=i?.ad_asset_url,this.pm.data.ad_tag_url=i?.ad_tag_url,this.pm.data.ad_creative_id=i?.ad_creative_id,this.pm.data.ad_id=i?.ad_id,this.pm.data.ad_universal_id=i?.ad_universal_id,i!=null&&i.ad_type&&(this.pm.data.ad_type=i?.ad_type)}}]),t})(),t_=e_,i_=function t(e){var i=this;pe(this,t),w(this,"lastWallClockTime",void 0);var a=function(){i.lastWallClockTime=Ce.now(),e.on("before*",r)},r=function(n){var s=Ce.now(),o=i.lastWallClockTime;i.lastWallClockTime=s,s-o>3e4&&(e.emit("devicesleep",{viewer_time:o}),Object.assign(e.data,{viewer_time:o}),e.send("devicesleep"),e.emit("devicewake",{viewer_time:s}),Object.assign(e.data,{viewer_time:s}),e.send("devicewake"))};e.one("playbackheartbeat",a),e.on("playbackheartbeatend",function(){e.off("before*",r),e.one("playbackheartbeat",a)})},a_=i_,Al=ut(Jt()),qm=(function(t){return t()})(function(){var t=function(){for(var i=0,a={};i<arguments.length;i++){var r=arguments[i];for(var n in r)a[n]=r[n]}return a};function e(i){function a(r,n,s){var o;if(typeof document<"u"){if(arguments.length>1){if(s=t({path:"/"},a.defaults,s),typeof s.expires=="number"){var l=new Date;l.setMilliseconds(l.getMilliseconds()+s.expires*864e5),s.expires=l}try{o=JSON.stringify(n),/^[\{\[]/.test(o)&&(n=o)}catch{}return i.write?n=i.write(n,r):n=encodeURIComponent(String(n)).replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,decodeURIComponent),r=encodeURIComponent(String(r)),r=r.replace(/%(23|24|26|2B|5E|60|7C)/g,decodeURIComponent),r=r.replace(/[\(\)]/g,escape),document.cookie=[r,"=",n,s.expires?"; expires="+s.expires.toUTCString():"",s.path?"; path="+s.path:"",s.domain?"; domain="+s.domain:"",s.secure?"; secure":""].join("")}r||(o={});for(var u=document.cookie?document.cookie.split("; "):[],m=/(%[0-9A-Z]{2})+/g,p=0;p<u.length;p++){var h=u[p].split("="),d=h.slice(1).join("=");d.charAt(0)==='"'&&(d=d.slice(1,-1));try{var v=h[0].replace(m,decodeURIComponent);if(d=i.read?i.read(d,v):i(d,v)||d.replace(m,decodeURIComponent),this.json)try{d=JSON.parse(d)}catch{}if(r===v){o=d;break}r||(o[v]=d)}catch{}}return o}}return a.set=a,a.get=function(r){return a.call(a,r)},a.getJSON=function(){return a.apply({json:!0},[].slice.call(arguments))},a.defaults={},a.remove=function(r,n){a(r,"",t(n,{expires:-1}))},a.withConverter=e,a}return e(function(){})}),Ym="muxData",r_=function(t){return Object.entries(t).map(function(e){var i=fi(e,2),a=i[0],r=i[1];return"".concat(a,"=").concat(r)}).join("&")},n_=function(t){return t.split("&").reduce(function(e,i){var a=fi(i.split("="),2),r=a[0],n=a[1],s=+n,o=n&&s==n?s:n;return e[r]=o,e},{})},Gm=function(){var t;try{t=n_(qm.get(Ym)||"")}catch{t={}}return t},zm=function(t){try{qm.set(Ym,r_(t),{expires:365})}catch{}},s_=function(){var t=Gm();return t.mux_viewer_id=t.mux_viewer_id||kn(),t.msn=t.msn||Math.random(),zm(t),{mux_viewer_id:t.mux_viewer_id,mux_sample_number:t.msn}},o_=function(){var t=Gm(),e=Ce.now();return t.session_start&&(t.sst=t.session_start,delete t.session_start),t.session_id&&(t.sid=t.session_id,delete t.session_id),t.session_expires&&(t.sex=t.session_expires,delete t.session_expires),(!t.sex||t.sex<e)&&(t.sid=kn(),t.sst=e),t.sex=e+1500*1e3,zm(t),{session_id:t.sid,session_start:t.sst,session_expires:t.sex}};function l_(t,e){var i=e.beaconCollectionDomain,a=e.beaconDomain;if(i){var r=/localhost(?::\d+)?$/.test(i)?"http://":"https://";return r+i}t=t||"inferred";var n=a||"litix.io";return t.match(/^[a-z0-9]+$/)?"https://"+t+"."+n:"https://img.litix.io/a.gif"}var d_={a:"env",b:"beacon",c:"custom",d:"ad",e:"event",f:"experiment",i:"internal",m:"mux",n:"response",p:"player",q:"request",r:"retry",s:"session",t:"timestamp",u:"viewer",v:"video",w:"page",x:"view",y:"sub"},u_=Qm(d_),c_={ad:"ad",af:"affiliate",ag:"aggregate",ap:"api",al:"application",ao:"audio",ar:"architecture",as:"asset",au:"autoplay",av:"average",bi:"bitrate",bn:"brand",br:"break",bw:"browser",by:"bytes",bz:"business",ca:"cached",cb:"cancel",cc:"codec",cd:"code",cg:"category",ch:"changed",ci:"client",ck:"clicked",cl:"canceled",cm:"cmcd",cn:"config",co:"count",ce:"counter",cp:"complete",cq:"creator",cr:"creative",cs:"captions",ct:"content",cu:"current",cv:"cumulative",cx:"connection",cz:"context",da:"data",dg:"downscaling",dm:"domain",dn:"cdn",do:"downscale",dr:"drm",dp:"dropped",du:"duration",dv:"device",dy:"dynamic",eb:"enabled",ec:"encoding",ed:"edge",en:"end",eg:"engine",em:"embed",er:"error",ep:"experiments",es:"errorcode",et:"errortext",ee:"event",ev:"events",ex:"expires",ez:"exception",fa:"failed",fi:"first",fm:"family",ft:"format",fp:"fps",fq:"frequency",fr:"frame",fs:"fullscreen",ha:"has",hb:"holdback",he:"headers",ho:"host",hn:"hostname",ht:"height",id:"id",ii:"init",in:"instance",ip:"ip",is:"is",ke:"key",la:"language",lb:"labeled",le:"level",li:"live",ld:"loaded",lo:"load",lw:"low",ls:"lists",lt:"latency",ma:"max",md:"media",me:"message",mf:"manifest",mi:"mime",ml:"midroll",mm:"min",mn:"manufacturer",mo:"model",mp:"mode",ms:"ms",mx:"mux",ne:"newest",nm:"name",no:"number",on:"on",or:"origin",os:"os",pa:"paused",pb:"playback",pd:"producer",pe:"percentage",pf:"played",pg:"program",ph:"playhead",pi:"plugin",pl:"preroll",pn:"playing",po:"poster",pp:"pip",pr:"preload",ps:"position",pt:"part",pv:"previous",py:"property",px:"pop",pz:"plan",ra:"rate",rd:"requested",re:"rebuffer",rf:"rendition",rg:"range",rm:"remote",ro:"ratio",rp:"response",rq:"request",rs:"requests",sa:"sample",sd:"skipped",se:"session",sh:"shift",sk:"seek",sm:"stream",so:"source",sq:"sequence",sr:"series",ss:"status",st:"start",su:"startup",sv:"server",sw:"software",sy:"severity",ta:"tag",tc:"tech",te:"text",tg:"target",th:"throughput",ti:"time",tl:"total",to:"to",tt:"title",ty:"type",ug:"upscaling",un:"universal",up:"upscale",ur:"url",us:"user",va:"variant",vd:"viewed",vi:"video",ve:"version",vw:"view",vr:"viewer",wd:"width",wa:"watch",wt:"waiting"},eh=Qm(c_);function Qm(t){var e={};for(var i in t)t.hasOwnProperty(i)&&(e[t[i]]=i);return e}function ql(t){var e={},i={};return Object.keys(t).forEach(function(a){var r=!1;if(t.hasOwnProperty(a)&&t[a]!==void 0){var n=a.split("_"),s=n[0],o=u_[s];o||(te.info("Data key word `"+n[0]+"` not expected in "+a),o=s+"_"),n.splice(1).forEach(function(l){l==="url"&&(r=!0),eh[l]?o+=eh[l]:Number.isInteger(Number(l))?o+=l:(te.info("Data key word `"+l+"` not expected in "+a),o+="_"+l+"_")}),r?i[o]=t[a]:e[o]=t[a]}}),Object.assign(e,i)}var sa=ut(Jt()),h_=ut(Bm()),m_={maxBeaconSize:300,maxQueueLength:3600,baseTimeBetweenBeacons:1e4,maxPayloadKBSize:500},p_=56*1024,v_=["hb","requestcompleted","requestfailed","requestcanceled"],f_="https://img.litix.io",Ei=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};this._beaconUrl=t||f_,this._eventQueue=[],this._postInFlight=!1,this._resendAfterPost=!1,this._failureCount=0,this._sendTimeout=!1,this._options=Object.assign({},m_,e)};Ei.prototype.queueEvent=function(t,e){var i=Object.assign({},e);return this._eventQueue.length<=this._options.maxQueueLength||t==="eventrateexceeded"?(this._eventQueue.push(i),this._sendTimeout||this._startBeaconSending(),this._eventQueue.length<=this._options.maxQueueLength):!1};Ei.prototype.flushEvents=function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:!1;if(t&&this._eventQueue.length===1){this._eventQueue.pop();return}this._eventQueue.length&&this._sendBeaconQueue(),this._startBeaconSending()};Ei.prototype.destroy=function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:!1;this.destroyed=!0,t?this._clearBeaconQueue():this.flushEvents(),sa.default.clearTimeout(this._sendTimeout)};Ei.prototype._clearBeaconQueue=function(){var t=this._eventQueue.length>this._options.maxBeaconSize?this._eventQueue.length-this._options.maxBeaconSize:0,e=this._eventQueue.slice(t);t>0&&Object.assign(e[e.length-1],ql({mux_view_message:"event queue truncated"}));var i=this._createPayload(e);jm(this._beaconUrl,i,!0,function(){})};Ei.prototype._sendBeaconQueue=function(){var t=this;if(this._postInFlight){this._resendAfterPost=!0;return}var e=this._eventQueue.slice(0,this._options.maxBeaconSize);this._eventQueue=this._eventQueue.slice(this._options.maxBeaconSize),this._postInFlight=!0;var i=this._createPayload(e),a=Ce.now();jm(this._beaconUrl,i,!1,function(r,n){n?(t._eventQueue=e.concat(t._eventQueue),t._failureCount+=1,te.info("Error sending beacon: "+n)):t._failureCount=0,t._roundTripTime=Ce.now()-a,t._postInFlight=!1,t._resendAfterPost&&(t._resendAfterPost=!1,t._eventQueue.length>0&&t._sendBeaconQueue())})};Ei.prototype._getNextBeaconTime=function(){if(!this._failureCount)return this._options.baseTimeBetweenBeacons;var t=Math.pow(2,this._failureCount-1);return t=t*Math.random(),(1+t)*this._options.baseTimeBetweenBeacons};Ei.prototype._startBeaconSending=function(){var t=this;sa.default.clearTimeout(this._sendTimeout),!this.destroyed&&(this._sendTimeout=sa.default.setTimeout(function(){t._eventQueue.length&&t._sendBeaconQueue(),t._startBeaconSending()},this._getNextBeaconTime()))};Ei.prototype._createPayload=function(t){var e=this,i={transmission_timestamp:Math.round(Ce.now())};this._roundTripTime&&(i.rtt_ms=Math.round(this._roundTripTime));var a,r,n,s=function(){a=JSON.stringify({metadata:i,events:r||t}),n=a.length/1024},o=function(){return n<=e._options.maxPayloadKBSize};return s(),o()||(te.info("Payload size is too big ("+n+" kb). Removing unnecessary events."),r=t.filter(function(l){return v_.indexOf(l.e)===-1}),s()),o()||(te.info("Payload size still too big ("+n+" kb). Cropping fields.."),r.forEach(function(l){for(var u in l){var m=l[u],p=50*1024;typeof m=="string"&&m.length>p&&(l[u]=m.substring(0,p))}}),s()),a};var E_=typeof h_.default.exitPictureInPicture=="function"?function(t){return t.length<=p_}:function(t){return!1},jm=function(t,e,i,a){if(i&&navigator&&navigator.sendBeacon&&navigator.sendBeacon(t,e)){a();return}if(sa.default.fetch){sa.default.fetch(t,{method:"POST",body:e,headers:{"Content-Type":"text/plain"},keepalive:E_(e)}).then(function(n){return a(null,n.ok?null:"Error")}).catch(function(n){return a(null,n)});return}if(sa.default.XMLHttpRequest){var r=new sa.default.XMLHttpRequest;r.onreadystatechange=function(){if(r.readyState===4)return a(null,r.status!==200?"error":void 0)},r.open("POST",t),r.setRequestHeader("Content-Type","text/plain"),r.send(e);return}a()},__=Ei,b_=["env_key","view_id","view_sequence_number","player_sequence_number","beacon_domain","player_playhead_time","viewer_time","mux_api_version","event","video_id","player_instance_id","player_error_code","player_error_message","player_error_context","player_error_severity","player_error_business_exception","view_playing_time_ms_cumulative","ad_playing_time_ms_cumulative"],g_=["adplay","adplaying","adpause","adfirstquartile","admidpoint","adthirdquartile","adended","adresponse","adrequest"],y_=["ad_id","ad_creative_id","ad_universal_id"],T_=["viewstart","error","ended","viewend"],A_=600*1e3,k_=(function(){function t(e,i){var a=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};pe(this,t);var r,n,s,o,l,u,m,p,h,d,v,E;w(this,"mux",void 0),w(this,"envKey",void 0),w(this,"options",void 0),w(this,"eventQueue",void 0),w(this,"sampleRate",void 0),w(this,"disableCookies",void 0),w(this,"respectDoNotTrack",void 0),w(this,"previousBeaconData",void 0),w(this,"lastEventTime",void 0),w(this,"rateLimited",void 0),w(this,"pageLevelData",void 0),w(this,"viewerData",void 0),this.mux=e,this.envKey=i,this.options=a,this.previousBeaconData=null,this.lastEventTime=0,this.rateLimited=!1,this.eventQueue=new __(l_(this.envKey,this.options));var b;this.sampleRate=(b=this.options.sampleRate)!==null&&b!==void 0?b:1;var y;this.disableCookies=(y=this.options.disableCookies)!==null&&y!==void 0?y:!1;var T;this.respectDoNotTrack=(T=this.options.respectDoNotTrack)!==null&&T!==void 0?T:!1,this.previousBeaconData=null,this.lastEventTime=0,this.rateLimited=!1,this.pageLevelData={mux_api_version:this.mux.API_VERSION,mux_embed:this.mux.NAME,mux_embed_version:this.mux.VERSION,viewer_application_name:(r=this.options.platform)===null||r===void 0?void 0:r.name,viewer_application_version:(n=this.options.platform)===null||n===void 0?void 0:n.version,viewer_application_engine:(s=this.options.platform)===null||s===void 0?void 0:s.layout,viewer_device_name:(o=this.options.platform)===null||o===void 0?void 0:o.product,viewer_device_category:"",viewer_device_manufacturer:(l=this.options.platform)===null||l===void 0?void 0:l.manufacturer,viewer_os_family:(m=this.options.platform)===null||m===void 0||(u=m.os)===null||u===void 0?void 0:u.family,viewer_os_architecture:(h=this.options.platform)===null||h===void 0||(p=h.os)===null||p===void 0?void 0:p.architecture,viewer_os_version:(v=this.options.platform)===null||v===void 0||(d=v.os)===null||d===void 0?void 0:d.version,page_url:Al.default===null||Al.default===void 0||(E=Al.default.location)===null||E===void 0?void 0:E.href},this.viewerData=this.disableCookies?{}:s_()}return ct(t,[{key:"send",value:function(e,i){if(!(!e||!(i!=null&&i.view_id))){if(this.respectDoNotTrack&&Kl())return te.info("Not sending `"+e+"` because Do Not Track is enabled");if(!i||typeof i!="object")return te.error("A data object was expected in send() but was not provided");var a=this.disableCookies?{}:o_(),r=ou(wn({},this.pageLevelData,i,a,this.viewerData),{event:e,env_key:this.envKey});r.user_id&&(r.viewer_user_id=r.user_id,delete r.user_id);var n,s=((n=r.mux_sample_number)!==null&&n!==void 0?n:0)>=this.sampleRate,o=this._deduplicateBeaconData(e,r),l=ql(o);if(this.lastEventTime=this.mux.utils.now(),s)return te.info("Not sending event due to sample rate restriction",e,r,l);if(this.envKey||te.info("Missing environment key (envKey) - beacons will be dropped if the video source is not a valid mux video URL",e,r,l),!this.rateLimited)if(te.info("Sending event",e,r,l),this.rateLimited=!this.eventQueue.queueEvent(e,l),this.mux.WINDOW_UNLOADING&&e==="viewend")this.eventQueue.destroy(!0);else{if(this.mux.WINDOW_HIDDEN&&e==="hb")this.eventQueue.flushEvents(!0);else if(T_.indexOf(e)>=0){if(e==="error"&&i.player_error_severity==="warning")return;this.eventQueue.flushEvents()}if(this.rateLimited)return r.event="eventrateexceeded",l=ql(r),this.eventQueue.queueEvent(r.event,l),te.error("Beaconing disabled due to rate limit.")}}}},{key:"destroy",value:function(){this.eventQueue.destroy(!1)}},{key:"_deduplicateBeaconData",value:function(e,i){var a=this,r={},n=i.view_id;if(n==="-1"||e==="viewstart"||e==="viewend"||!this.previousBeaconData||this.mux.utils.now()-this.lastEventTime>=A_)r=wn({},i),n&&(this.previousBeaconData=r),n&&e==="viewend"&&(this.previousBeaconData=null);else{var s=e.indexOf("request")===0;Object.entries(i).forEach(function(o){var l=fi(o,2),u=l[0],m=l[1];a.previousBeaconData&&(m!==a.previousBeaconData[u]||b_.indexOf(u)>-1||a.objectHasChanged(s,u,m,a.previousBeaconData[u])||a.eventRequiresKey(e,u))&&(r[u]=m,a.previousBeaconData[u]=m)})}return r}},{key:"objectHasChanged",value:function(e,i,a,r){return!e||i.indexOf("request_")!==0?!1:i==="request_response_headers"||typeof a!="object"||typeof r!="object"?!0:Object.keys(a||{}).length!==Object.keys(r||{}).length}},{key:"eventRequiresKey",value:function(e,i){return!!(e==="renditionchange"&&i.indexOf("video_source_")===0||y_.includes(i)&&g_.includes(e)||e==="playbackmodechange"&&i.indexOf("player_playback_mode")===0)}}]),t})(),S_=function t(e){pe(this,t);var i=0,a=0,r=0,n=0,s=0,o=0,l=0,u=function(h,d){var v=d.request_start,E=d.request_response_start,b=d.request_response_end,y=d.request_bytes_loaded;n++;var T,g;if(E?(T=E-(v??0),g=(b??0)-E):g=(b??0)-(v??0),g>0&&y&&y>0){var k=y/g*8e3;s++,a+=y,r+=g,e.data.view_min_request_throughput=Math.min(e.data.view_min_request_throughput||1/0,k),e.data.view_average_request_throughput=a/r*8e3,e.data.view_request_count=n,T>0&&(i+=T,e.data.view_max_request_latency=Math.max(e.data.view_max_request_latency||0,T),e.data.view_average_request_latency=i/s)}},m=function(h,d){n++,o++,e.data.view_request_count=n,e.data.view_request_failed_count=o},p=function(h,d){n++,l++,e.data.view_request_count=n,e.data.view_request_canceled_count=l};e.on("requestcompleted",u),e.on("requestfailed",m),e.on("requestcanceled",p)},w_=S_,I_=3600*1e3,R_=function t(e){var i=this;pe(this,t),w(this,"_lastEventTime",void 0),e.on("before*",function(a,r){var n=r.viewer_time,s=Ce.now(),o=i._lastEventTime;if(i._lastEventTime=s,o&&s-o>I_){var l=Object.keys(e.data).reduce(function(m,p){return p.indexOf("video_")===0?Object.assign(m,w({},p,e.data[p])):m},{});e.mux.log.info("Received event after at least an hour inactivity, creating a new view");var u=e.playbackHeartbeat._playheadShouldBeProgressing;e._resetView(Object.assign({viewer_time:n},l)),e.playbackHeartbeat._playheadShouldBeProgressing=u,e.playbackHeartbeat._playheadShouldBeProgressing&&a.type!=="play"&&a.type!=="adbreakstart"&&(e.emit("play",{viewer_time:n}),a.type!=="playing"&&e.emit("playing",{viewer_time:n}))}})},L_=R_,C_=function t(e){pe(this,t);var i=function(o){var l=D_(o),u=M_(o);if(l!=null&&!th(l,n)&&s<=u){n=l,s=u;var m={video_cdn:l};e.emit("cdnchange",m)}},a=null,r=null,n=null,s=0;e.on("viewinit",function(){a=null,r=null,n=null,s=0}),e.on("beforecdnchange",function(o,l){var u=l?.video_cdn;u&&(typeof l.video_previous_cdn>"u"||l.video_previous_cdn===null)&&(th(u,r)?l.video_previous_cdn=a??void 0:(l.video_previous_cdn=r??void 0,a=r,r=u))}),e.on("requestcompleted",function(o,l){i(l)})};function th(t,e){return t?.toLowerCase()===e?.toLowerCase()}function D_(t){var e;return t!=null&&t.request_type&&(t.request_type==="media"||t.request_type==="video")&&!((e=t.request_response_headers)===null||e===void 0)&&e["x-cdn"]?t.request_response_headers["x-cdn"]:t!=null&&t.video_cdn?t.video_cdn:null}function M_(t){return t!=null&&t.request_start?t.request_start:t!=null&&t.viewer_time?t.viewer_time:Date.now()}var O_=C_,x_=function(t){try{return JSON.parse(t),!0}catch{return!1}},N_=function t(e){var i=this;pe(this,t),w(this,"_emittingAutomaticEvent",!1),w(this,"_hasInitialized",!1),w(this,"_currentMode","standard"),e.on("viewstart",function(){i._hasInitialized||(i._hasInitialized=!0,i._currentMode=e.data.player_playback_mode||"standard",i._emittingAutomaticEvent=!0,e.emit("playbackmodechange",{player_playback_mode:i._currentMode,player_playback_mode_data:"{}"}),i._emittingAutomaticEvent=!1)}),e.on("viewend",function(){i._hasInitialized=!1}),e.on("playbackmodechange",function(a,r){i._emittingAutomaticEvent||(r.player_playback_mode_data?x_(r.player_playback_mode_data)||(e.mux.log.warn("Invalid JSON string for player_playback_mode_data"),r.player_playback_mode_data="{}"):r.player_playback_mode_data="{}",e.data.player_playback_mode_data=r.player_playback_mode_data,e.data.player_playback_mode=r.player_playback_mode,i._currentMode=r.player_playback_mode)})},P_=N_,$_=(function(){function t(e){pe(this,t),w(this,"pm",void 0),w(this,"_currentRangeStart",void 0),w(this,"_lastPlayheadTime",void 0),this.pm=e,this._currentRangeStart=null,this._lastPlayheadTime=null,e.on("playbackheartbeat",this._updatePlaybackRange.bind(this)),e.on("playbackheartbeatend",this._endPlaybackRange.bind(this))}return ct(t,[{key:"_updateLastRangeEnd",value:function(){var e=this.pm.data.video_playback_ranges;if(e&&e.length>0){var i=this.pm.data.player_playhead_time||0;e[e.length-1][1]=i}}},{key:"_updatePlaybackRange",value:function(){var e,i=this.pm.data.player_playhead_time||0;if(!(!this.pm.disableAdPlaybackRangeFiltering&&!((e=this.pm.adTracker)===null||e===void 0)&&e.isAdBreak&&this._lastPlayheadTime!==null&&i<this._lastPlayheadTime)){if(this._lastPlayheadTime!==null&&this._currentRangeStart!==null){var a=Math.abs(i-this._lastPlayheadTime);if(a>1e3){var r=this.pm.data.video_playback_ranges;r&&r.length>0&&(r[r.length-1][1]=this._lastPlayheadTime),this._currentRangeStart=null}}if(this._currentRangeStart===null){var n=this.pm.data.video_playback_ranges||[];n.length>0&&n[n.length-1][1]===i?this._currentRangeStart=n[n.length-1][0]:(this._currentRangeStart=i,n.push([i,i])),this.pm.data.video_playback_ranges=n}else this._updateLastRangeEnd();this._lastPlayheadTime=i}}},{key:"_endPlaybackRange",value:function(){this._currentRangeStart!==null&&(this._updateLastRangeEnd(),this._currentRangeStart=null,this._lastPlayheadTime=null)}}]),t})(),U_=$_,Ft=Object.freeze({CELLULAR:"cellular",WIFI:"wifi",WIRED:"wired",OTHER:"other",NO_CONNECTION:"no_connection",UNKNOWN:"unknown"}),H_=function(t){if(!t)return Ft.UNKNOWN;switch(t){case"cellular":case"wimax":return Ft.CELLULAR;case"wifi":return Ft.WIFI;case"ethernet":return Ft.WIRED;case"none":return Ft.NO_CONNECTION;case"bluetooth":case"other":return Ft.OTHER;case"unknown":return Ft.UNKNOWN;default:return Ft.OTHER}},B_=function(t){return typeof t=="object"&&"connection"in t&&typeof t.connection=="object"},qi=ut(Jt()),W_=(function(){function t(e){var i=this;pe(this,t),w(this,"pm",void 0),w(this,"lastType",void 0),w(this,"lastLowDataMode",void 0),this.pm=e,this.pm.one("viewinit",function(){var a,r=i.emit.bind(i);r(),qi.default.addEventListener("online",r),qi.default.addEventListener("offline",r),(a=t.connection)===null||a===void 0||a.addEventListener("change",r),i.pm.on("destroy",function(){var n;(n=t.connection)===null||n===void 0||n.removeEventListener("change",r),qi.default.removeEventListener("online",r),qi.default.removeEventListener("offline",r)})})}return ct(t,[{key:"type",get:function(){var e,i;return((e=qi.default.navigator)===null||e===void 0?void 0:e.onLine)===!1?Ft.NO_CONNECTION:!((i=t.connection)===null||i===void 0)&&i.type?H_(t.connection.type):Ft.UNKNOWN}},{key:"lowDataMode",get:function(){var e;return(e=t.connection)===null||e===void 0?void 0:e.saveData}},{key:"emit",value:function(){var e=this.type,i=this.lowDataMode;e===this.lastType&&i===this.lastLowDataMode||(this.lastType=e,this.lastLowDataMode=i,this.pm.emit("networkchange",wn({viewer_connection_type:e},i!==void 0&&{viewer_connection_low_data_mode:i})))}}],[{key:"connection",get:function(){return B_(qi.default.navigator)?qi.default.navigator.connection:null}}]),t})(),F_=W_,K_=["viewstart","ended","loadstart","pause","play","playing","ratechange","waiting","adplay","adpause","adended","aderror","adplaying","adrequest","adresponse","adbreakstart","adbreakend","adfirstquartile","admidpoint","adthirdquartile","rebufferstart","rebufferend","seeked","error","hb","requestcompleted","requestfailed","requestcanceled","renditionchange","networkchange","cdnchange","playbackmodechange"],V_=new Set(["requestcompleted","requestfailed","requestcanceled"]),q_=(function(t){hE(i,t);var e=EE(i);function i(a,r,n){pe(this,i);var s;s=e.call(this),w(P(s),"pageLoadEndTime",void 0),w(P(s),"pageLoadInitTime",void 0),w(P(s),"_destroyed",void 0),w(P(s),"_heartBeatTimeout",void 0),w(P(s),"adTracker",void 0),w(P(s),"dashjs",void 0),w(P(s),"data",void 0),w(P(s),"disablePlayheadRebufferTracking",void 0),w(P(s),"disableRebufferTracking",void 0),w(P(s),"disableAdPlaybackRangeFiltering",void 0),w(P(s),"errorTracker",void 0),w(P(s),"errorTranslator",void 0),w(P(s),"emitTranslator",void 0),w(P(s),"getAdData",void 0),w(P(s),"getPlayheadTime",void 0),w(P(s),"getStateData",void 0),w(P(s),"stateDataTranslator",void 0),w(P(s),"hlsjs",void 0),w(P(s),"id",void 0),w(P(s),"longResumeTracker",void 0),w(P(s),"minimumRebufferDuration",void 0),w(P(s),"mux",void 0),w(P(s),"playbackEventDispatcher",void 0),w(P(s),"playbackHeartbeat",void 0),w(P(s),"playbackHeartbeatTime",void 0),w(P(s),"playheadTime",void 0),w(P(s),"seekingTracker",void 0),w(P(s),"sustainedRebufferThreshold",void 0),w(P(s),"watchTimeTracker",void 0),w(P(s),"currentFragmentPDT",void 0),w(P(s),"currentFragmentStart",void 0),s.pageLoadInitTime=go.navigationStart(),s.pageLoadEndTime=go.domContentLoadedEventEnd();var o={debug:!1,minimumRebufferDuration:250,sustainedRebufferThreshold:1e3,playbackHeartbeatTime:25,beaconDomain:"litix.io",sampleRate:1,disableCookies:!1,respectDoNotTrack:!1,disableRebufferTracking:!1,disablePlayheadRebufferTracking:!1,disableAdPlaybackRangeFiltering:!1,errorTranslator:function(h){return h},emitTranslator:function(){for(var h=arguments.length,d=new Array(h),v=0;v<h;v++)d[v]=arguments[v];return d},stateDataTranslator:function(h){return h}};s.mux=a,s.id=r,n!=null&&n.beaconDomain&&s.mux.log.warn("The `beaconDomain` setting has been deprecated in favor of `beaconCollectionDomain`. Please change your integration to use `beaconCollectionDomain` instead of `beaconDomain`."),n=Object.assign(o,n),n.data=n.data||{},n.data.property_key&&(n.data.env_key=n.data.property_key,delete n.data.property_key),te.level=n.debug?ra.DEBUG:ra.WARN,s.getPlayheadTime=n.getPlayheadTime,s.getStateData=n.getStateData||function(){return{}},s.getAdData=n.getAdData||function(){},s.minimumRebufferDuration=n.minimumRebufferDuration,s.sustainedRebufferThreshold=n.sustainedRebufferThreshold,s.playbackHeartbeatTime=n.playbackHeartbeatTime,s.disableRebufferTracking=n.disableRebufferTracking,s.disableRebufferTracking&&s.mux.log.warn("Disabling rebuffer tracking. This should only be used in specific circumstances as a last resort when your player is known to unreliably track rebuffering."),s.disablePlayheadRebufferTracking=n.disablePlayheadRebufferTracking,s.disableAdPlaybackRangeFiltering=n.disableAdPlaybackRangeFiltering,s.errorTranslator=n.errorTranslator,s.emitTranslator=n.emitTranslator,s.stateDataTranslator=n.stateDataTranslator,s.playbackEventDispatcher=new k_(a,n.data.env_key,n),s.data={player_instance_id:kn(),mux_sample_rate:n.sampleRate,beacon_domain:n.beaconCollectionDomain||n.beaconDomain},s.data.view_sequence_number=1,s.data.player_sequence_number=1;var l=(function(){typeof this.data.view_start>"u"&&(this.data.view_start=this.mux.utils.now(),this.emit("viewstart"),this.emit("renditionchange"))}).bind(P(s));if(s.on("viewinit",function(h,d){this._resetVideoData(),this._resetViewData(),this._resetErrorData(),this._updateStateData(),Object.assign(this.data,d),this._initializeViewData(),this.one("play",l),this.one("adbreakstart",l)}),s.on("videochange",function(h,d){this._resetView(d)}),s.on("programchange",function(h,d){this.data.player_is_paused&&this.mux.log.warn("The `programchange` event is intended to be used when the content changes mid playback without the video source changing, however the video is not currently playing. If the video source is changing please use the videochange event otherwise you will lose startup time information."),this._resetView(Object.assign(d,{view_program_changed:!0})),l(),this.emit("play"),this.emit("playing")}),s.on("fragmentchange",function(h,d){this.currentFragmentPDT=d.currentFragmentPDT,this.currentFragmentStart=d.currentFragmentStart}),s.on("destroy",s.destroy),typeof window<"u"&&typeof window.addEventListener=="function"&&typeof window.removeEventListener=="function"){var u=function(){var h=typeof s.data.view_start<"u";s.mux.WINDOW_HIDDEN=document.visibilityState==="hidden",h&&s.mux.WINDOW_HIDDEN&&(s.data.player_is_paused||s.emit("hb"))};window.addEventListener("visibilitychange",u,!1);var m=function(h){h.persisted||s.destroy()};window.addEventListener("pagehide",m,!1),s.on("destroy",function(){window.removeEventListener("visibilitychange",u),window.removeEventListener("pagehide",m)})}s.on("playerready",function(h,d){Object.assign(this.data,d)}),K_.forEach(function(h){s.on(h,function(d,v){h.indexOf("ad")!==0&&this._updateStateData(),Object.assign(this.data,v),this._sanitizeData()}),s.on("after"+h,function(){(h!=="error"||this.errorTracker.viewErrored)&&this.send(h)})}),s.on("viewend",function(h,d){Object.assign(s.data,d)});var p=function(h){var d=this.mux.utils.now();this.data.player_init_time&&(this.data.player_startup_time=d-this.data.player_init_time),this.pageLoadInitTime=this.data.page_load_init_time||this.pageLoadInitTime,this.pageLoadEndTime=this.data.page_load_end_time||this.pageLoadEndTime,!this.mux.PLAYER_TRACKED&&this.pageLoadInitTime&&(this.mux.PLAYER_TRACKED=!0,(this.data.player_init_time||this.pageLoadEndTime)&&(this.data.page_load_time=Math.min(this.data.player_init_time||1/0,this.pageLoadEndTime||1/0)-this.pageLoadInitTime)),this.send("playerready"),delete this.data.player_startup_time,delete this.data.page_load_time};return s.one("playerready",p),s.longResumeTracker=new L_(P(s)),s.errorTracker=new NE(P(s)),new a_(P(s)),s.seekingTracker=new XE(P(s)),s.playheadTime=new WE(P(s)),s.playbackHeartbeat=new OE(P(s)),new QE(P(s)),s.watchTimeTracker=new $E(P(s)),new HE(P(s)),new U_(P(s)),s.adTracker=new t_(P(s)),new qE(P(s)),new KE(P(s)),new GE(P(s)),new w_(P(s)),new O_(P(s)),new P_(P(s)),new F_(P(s)),n.hlsjs&&s.addHLSJS(n),n.dashjs&&s.addDashJS(n),s.emit("viewinit",n.data),s}return ct(i,[{key:"emit",value:function(a,r){var n,s=Object.assign({viewer_time:this.mux.utils.now()},r),o=[a,s];if(this.emitTranslator)try{o=this.emitTranslator(a,s)}catch(l){this.mux.log.warn("Exception in emit translator callback.",l)}o!=null&&o.length&&(n=os(cr(i.prototype),"emit",this)).call.apply(n,[this].concat(Et(o)))}},{key:"destroy",value:function(){this._destroyed||(this._destroyed=!0,typeof this.data.view_start<"u"&&(this.emit("viewend"),this.send("viewend")),this.playbackEventDispatcher.destroy(),this.removeHLSJS(),this.removeDashJS(),window.clearTimeout(this._heartBeatTimeout))}},{key:"send",value:function(a){if(this.data.view_id){var r=Object.assign({},this.data),n=["player_program_time","player_manifest_newest_program_time","player_live_edge_program_time","player_program_time","video_holdback","video_part_holdback","video_target_duration","video_part_target_duration"];if(r.video_source_is_live===void 0&&(r.player_source_duration===1/0||r.video_source_duration===1/0?r.video_source_is_live=!0:(r.player_source_duration>0||r.video_source_duration>0)&&(r.video_source_is_live=!1)),r.video_source_is_live||n.forEach(function(u){r[u]=void 0}),r.video_source_url=r.video_source_url||r.player_source_url,r.video_source_url){var s=fi(Sn(r.video_source_url),2),o=s[0],l=s[1];r.video_source_domain=l,r.video_source_hostname=o}delete r.ad_request_id,r.video_playback_ranges&&(r.video_playback_range=JSON.stringify(r.video_playback_ranges.filter(function(u){return u[0]!==u[1]}).map(function(u){return"".concat(u[0],":").concat(u[1])})),delete r.video_playback_ranges),this.playbackEventDispatcher.send(a,r),this.data.view_sequence_number++,this.data.player_sequence_number++,V_.has(a)||this._restartHeartBeat(),a==="viewend"&&delete this.data.view_id}}},{key:"_resetView",value:function(a){this.emit("viewend"),this.send("viewend"),this.emit("viewinit",a)}},{key:"_updateStateData",value:function(){var a,r=this.getStateData();if(typeof this.stateDataTranslator=="function")try{r=this.stateDataTranslator(r)}catch(s){this.mux.log.warn("Exception in stateDataTranslator translator callback.",s)}if(!((a=this.data)===null||a===void 0)&&a.video_cdn&&r!=null&&r.video_cdn){r.video_cdn;var n=pE(r,["video_cdn"]);r=n}Object.assign(this.data,r),this.playheadTime._updatePlayheadTime(),this._sanitizeData()}},{key:"_sanitizeData",value:function(){var a=this,r=["player_width","player_height","video_source_width","video_source_height","player_playhead_time","video_source_bitrate"];r.forEach(function(s){var o=parseInt(a.data[s],10);a.data[s]=isNaN(o)?void 0:o});var n=["player_source_url","video_source_url"];n.forEach(function(s){if(a.data[s]){var o=a.data[s].toLowerCase();(o.indexOf("data:")===0||o.indexOf("blob:")===0)&&(a.data[s]="MSE style URL")}})}},{key:"_resetVideoData",value:function(){var a=this;Object.keys(this.data).forEach(function(r){r.indexOf("video_")===0&&delete a.data[r]})}},{key:"_resetViewData",value:function(){var a=this;Object.keys(this.data).forEach(function(r){r.indexOf("view_")===0&&delete a.data[r]}),this.data.view_sequence_number=1}},{key:"_resetErrorData",value:function(){delete this.data.player_error_code,delete this.data.player_error_message,delete this.data.player_error_context,delete this.data.player_error_severity,delete this.data.player_error_business_exception}},{key:"_initializeViewData",value:function(){var a=this,r=this.data.view_id=kn(),n=function(){r===a.data.view_id&&Se(a.data,"player_view_count",1)};this.data.player_is_paused?this.one("play",n):n()}},{key:"_restartHeartBeat",value:function(){var a=this;window.clearTimeout(this._heartBeatTimeout),this._heartBeatTimeout=window.setTimeout(function(){a.data.player_is_paused||a.emit("hb")},1e4)}},{key:"addHLSJS",value:function(a){if(!a.hlsjs){this.mux.log.warn("You must pass a valid hlsjs instance in order to track it.");return}if(this.hlsjs){this.mux.log.warn("An instance of HLS.js is already being monitored for this player.");return}this.hlsjs=a.hlsjs,AE(this.mux,this.id,a.hlsjs,{},a.Hls||window.Hls)}},{key:"removeHLSJS",value:function(){this.hlsjs&&(kE(this.hlsjs),this.hlsjs=void 0)}},{key:"addDashJS",value:function(a){if(!a.dashjs){this.mux.log.warn("You must pass a valid dashjs instance in order to track it.");return}if(this.dashjs){this.mux.log.warn("An instance of Dash.js is already being monitored for this player.");return}this.dashjs=a.dashjs,RE(this.mux,this.id,a.dashjs)}},{key:"removeDashJS",value:function(){this.dashjs&&(LE(this.dashjs),this.dashjs=void 0)}}]),i})(DE),Y_=q_,Sr=ut(Bm());function kl(){return Sr.default&&!!(Sr.default.fullscreenElement||Sr.default.webkitFullscreenElement||Sr.default.mozFullScreenElement||Sr.default.msFullscreenElement)}var G_=["loadstart","pause","play","playing","seeking","seeked","timeupdate","ratechange","stalled","waiting","error","ended"],z_={1:"MEDIA_ERR_ABORTED",2:"MEDIA_ERR_NETWORK",3:"MEDIA_ERR_DECODE",4:"MEDIA_ERR_SRC_NOT_SUPPORTED"};function Q_(t,e,i){var a=fi(bo(e),3),r=a[0],n=a[1],s=a[2],o=t.log,l=t.utils.getComputedStyle,u=t.utils.secondsToMs,m={automaticErrorTracking:!0};if(r){if(s!=="video"&&s!=="audio")return o.error("The element of `"+n+"` was not a media element.")}else return o.error("No element was found with the `"+n+"` query selector.");r.mux&&(r.mux.destroy(),delete r.mux,o.warn("Already monitoring this video element, replacing existing event listeners"));var p={getPlayheadTime:function(){return u(r.currentTime)},getStateData:function(){var d,v,E,b=((d=(v=this).getPlayheadTime)===null||d===void 0?void 0:d.call(v))||u(r.currentTime),y=this.hlsjs&&this.hlsjs.url,T=this.dashjs&&typeof this.dashjs.getSource=="function"&&this.dashjs.getSource(),g={player_is_paused:r.paused,player_width:parseInt(l(r,"width")),player_height:parseInt(l(r,"height")),player_autoplay_on:r.autoplay,player_preload_on:r.preload,player_language_code:r.lang,player_is_fullscreen:kl(),video_poster_url:r.poster,video_source_url:y||T||r.currentSrc,video_source_duration:u(r.duration),video_source_height:r.videoHeight,video_source_width:r.videoWidth,view_dropped_frame_count:r==null||(E=r.getVideoPlaybackQuality)===null||E===void 0?void 0:E.call(r).droppedVideoFrames};if(r.getStartDate&&b>0){var k=r.getStartDate();if(k&&typeof k.getTime=="function"&&k.getTime()){var D=k.getTime();if(g.player_program_time=D+b,r.seekable.length>0){var C=D+r.seekable.end(r.seekable.length-1);g.player_live_edge_program_time=C}}}return g}};i=Object.assign(m,i,p),i.data=Object.assign({player_software:"HTML5 Video Element",player_mux_plugin_name:"VideoElementMonitor",player_mux_plugin_version:t.VERSION},i.data),r.mux=r.mux||{},r.mux.deleted=!1,r.mux.emit=function(d,v){t.emit(n,d,v)},r.mux.updateData=function(d){r.mux.emit("hb",d)};var h=function(){o.error("The monitor for this video element has already been destroyed.")};r.mux.destroy=function(){Object.keys(r.mux.listeners).forEach(function(d){r.removeEventListener(d,r.mux.listeners[d],!1)}),delete r.mux.listeners,r.mux.fullscreenChangeListener&&(document.removeEventListener("fullscreenchange",r.mux.fullscreenChangeListener,!1),delete r.mux.fullscreenChangeListener),r.mux.destroy=h,r.mux.swapElement=h,r.mux.emit=h,r.mux.addHLSJS=h,r.mux.addDashJS=h,r.mux.removeHLSJS=h,r.mux.removeDashJS=h,r.mux.updateData=h,r.mux.setEmitTranslator=h,r.mux.setStateDataTranslator=h,r.mux.setGetPlayheadTime=h,r.mux.deleted=!0,t.emit(n,"destroy")},r.mux.swapElement=function(d){var v=fi(bo(d),3),E=v[0],b=v[1],y=v[2];if(E){if(y!=="video"&&y!=="audio")return t.log.error("The element of `"+b+"` was not a media element.")}else return t.log.error("No element was found with the `"+b+"` query selector.");E.muxId=r.muxId,delete r.muxId,E.mux=E.mux||{},E.mux.listeners=Object.assign({},r.mux.listeners),delete r.mux.listeners,Object.keys(E.mux.listeners).forEach(function(T){r.removeEventListener(T,E.mux.listeners[T],!1),E.addEventListener(T,E.mux.listeners[T],!1)}),E.mux.fullscreenChangeListener=r.mux.fullscreenChangeListener,delete r.mux.fullscreenChangeListener,E.mux.swapElement=r.mux.swapElement,E.mux.destroy=r.mux.destroy,delete r.mux,r=E},r.mux.addHLSJS=function(d){t.addHLSJS(n,d)},r.mux.addDashJS=function(d){t.addDashJS(n,d)},r.mux.removeHLSJS=function(){t.removeHLSJS(n)},r.mux.removeDashJS=function(){t.removeDashJS(n)},r.mux.setEmitTranslator=function(d){t.setEmitTranslator(n,d)},r.mux.setStateDataTranslator=function(d){t.setStateDataTranslator(n,d)},r.mux.setGetPlayheadTime=function(d){d||(d=i.getPlayheadTime),t.setGetPlayheadTime(n,d)},t.init(n,i),t.emit(n,"playerready"),r.paused||(t.emit(n,"play"),r.readyState>2&&t.emit(n,"playing")),r.mux.listeners={},G_.forEach(function(d){d==="error"&&!i.automaticErrorTracking||(r.mux.listeners[d]=function(){var v={};if(d==="error"){if(!r.error||r.error.code===1)return;v.player_error_code=r.error.code,v.player_error_message=z_[r.error.code]||r.error.message}t.emit(n,d,v)},r.addEventListener(d,r.mux.listeners[d],!1))}),r.mux.listeners.enterpictureinpicture=function(){t.emit(n,"playbackmodechange",{player_playback_mode:"pip",player_playback_mode_data:"{}"})},r.mux.listeners.leavepictureinpicture=function(){var d=kl()?"fullscreen":"standard";t.emit(n,"playbackmodechange",{player_playback_mode:d,player_playback_mode_data:"{}"})},r.addEventListener("enterpictureinpicture",r.mux.listeners.enterpictureinpicture,!1),r.addEventListener("leavepictureinpicture",r.mux.listeners.leavepictureinpicture,!1),r.mux.fullscreenChangeListener=function(){var d=kl(),v=document.fullscreenElement;if(d&&(v===r||v!=null&&v.contains(r)))t.emit(n,"playbackmodechange",{player_playback_mode:"fullscreen",player_playback_mode_data:"{}"});else if(!d){var E=document.pictureInPictureElement===r,b=E?"pip":"standard";t.emit(n,"playbackmodechange",{player_playback_mode:b,player_playback_mode_data:"{}"})}},document.addEventListener("fullscreenchange",r.mux.fullscreenChangeListener,!1)}function j_(t,e,i,a){var r=a;if(t&&typeof t[e]=="function")try{r=t[e].apply(t,i)}catch(n){te.info("safeCall error",n)}return r}var dn=ut(Jt()),wa;dn.default&&dn.default.WeakMap&&(wa=new WeakMap);function Z_(t,e){if(!t||!e||!dn.default||typeof dn.default.getComputedStyle!="function")return"";var i;return wa&&wa.has(t)&&(i=wa.get(t)),i||(i=dn.default.getComputedStyle(t,null),wa&&wa.set(t,i)),i.getPropertyValue(e)}function X_(t){return Math.floor(t*1e3)}var Yi={TARGET_DURATION:"#EXT-X-TARGETDURATION",PART_INF:"#EXT-X-PART-INF",SERVER_CONTROL:"#EXT-X-SERVER-CONTROL",INF:"#EXTINF",PROGRAM_DATE_TIME:"#EXT-X-PROGRAM-DATE-TIME",VERSION:"#EXT-X-VERSION",SESSION_DATA:"#EXT-X-SESSION-DATA"},Xo=function(t){return this.buffer="",this.manifest={segments:[],serverControl:{},sessionData:{}},this.currentUri={},this.process(t),this.manifest};Xo.prototype.process=function(t){var e;for(this.buffer+=t,e=this.buffer.indexOf(`
`);e>-1;e=this.buffer.indexOf(`
`))this.processLine(this.buffer.substring(0,e)),this.buffer=this.buffer.substring(e+1)};Xo.prototype.processLine=function(t){var e=t.indexOf(":"),i=ib(t,e),a=i[0],r=i.length===2?du(i[1]):void 0;if(a[0]!=="#")this.currentUri.uri=a,this.manifest.segments.push(this.currentUri),this.manifest.targetDuration&&!("duration"in this.currentUri)&&(this.currentUri.duration=this.manifest.targetDuration),this.currentUri={};else switch(a){case Yi.TARGET_DURATION:{if(!isFinite(r)||r<0)return;this.manifest.targetDuration=r,this.setHoldBack();break}case Yi.PART_INF:{Sl(this.manifest,i),this.manifest.partInf.partTarget&&(this.manifest.partTargetDuration=this.manifest.partInf.partTarget),this.setHoldBack();break}case Yi.SERVER_CONTROL:{Sl(this.manifest,i),this.setHoldBack();break}case Yi.INF:{r===0?this.currentUri.duration=.01:r>0&&(this.currentUri.duration=r);break}case Yi.PROGRAM_DATE_TIME:{var n=r,s=new Date(n);this.manifest.dateTimeString||(this.manifest.dateTimeString=n,this.manifest.dateTimeObject=s),this.currentUri.dateTimeString=n,this.currentUri.dateTimeObject=s;break}case Yi.VERSION:{Sl(this.manifest,i);break}case Yi.SESSION_DATA:{var o=ab(i[1]),l=Vm(o);Object.assign(this.manifest.sessionData,l)}}};Xo.prototype.setHoldBack=function(){var t=this.manifest,e=t.serverControl,i=t.targetDuration,a=t.partTargetDuration;if(e){var r="holdBack",n="partHoldBack",s=i&&i*3,o=a&&a*2;i&&!e.hasOwnProperty(r)&&(e[r]=s),s&&e[r]<s&&(e[r]=s),a&&!e.hasOwnProperty(n)&&(e[n]=a*3),a&&e[n]<o&&(e[n]=o)}};var Sl=function(t,e){var i=Zm(e[0].replace("#EXT-X-","")),a;tb(e[1])?(a={},a=Object.assign(eb(e[1]),a)):a=du(e[1]),t[i]=a},Zm=function(t){return t.toLowerCase().replace(/-(\w)/g,function(e){return e[1].toUpperCase()})},du=function(t){if(t.toLowerCase()==="yes"||t.toLowerCase()==="no")return t.toLowerCase()==="yes";var e=t.indexOf(":")!==-1?t:parseFloat(t);return isNaN(e)?t:e},J_=function(t){var e={},i=t.split("=");if(i.length>1){var a=Zm(i[0]);e[a]=du(i[1])}return e},eb=function(t){for(var e=t.split(","),i={},a=0;e.length>a;a++){var r=e[a],n=J_(r);i=Object.assign(n,i)}return i},tb=function(t){return t.indexOf("=")>-1},ib=function(t,e){return e===-1?[t]:[t.substring(0,e),t.substring(e+1)]},ab=function(t){var e={};if(t){var i=t.search(","),a=t.slice(0,i),r=t.slice(i+1),n=[a,r];return n.forEach(function(s,o){for(var l=s.replace(/['"]+/g,"").split("="),u=0;u<l.length;u++)l[u]==="DATA-ID"&&(e["DATA-ID"]=l[1-u]),l[u]==="VALUE"&&(e.VALUE=l[1-u])}),{data:e}}},rb=Xo,nb={safeCall:j_,safeIncrement:Se,getComputedStyle:Z_,secondsToMs:X_,assign:Object.assign,headersStringToObject:lu,cdnHeadersToRequestId:yo,extractHostnameAndDomain:Sn,extractHostname:kt,manifestParser:rb,generateShortID:Fm,generateUUID:kn,now:Ce.now,findMediaElement:bo},sb=nb,ob={PLAYER_READY:"playerready",VIEW_INIT:"viewinit",VIDEO_CHANGE:"videochange",PLAY:"play",PAUSE:"pause",PLAYING:"playing",TIME_UPDATE:"timeupdate",SEEKING:"seeking",SEEKED:"seeked",REBUFFER_START:"rebufferstart",REBUFFER_END:"rebufferend",ERROR:"error",ENDED:"ended",RENDITION_CHANGE:"renditionchange",ORIENTATION_CHANGE:"orientationchange",PLAYBACK_MODE_CHANGE:"playbackmodechange",NETWORK_CHANGE:"networkchange",AD_REQUEST:"adrequest",AD_RESPONSE:"adresponse",AD_BREAK_START:"adbreakstart",AD_PLAY:"adplay",AD_PLAYING:"adplaying",AD_PAUSE:"adpause",AD_FIRST_QUARTILE:"adfirstquartile",AD_MID_POINT:"admidpoint",AD_THIRD_QUARTILE:"adthirdquartile",AD_ENDED:"adended",AD_BREAK_END:"adbreakend",AD_ERROR:"aderror",REQUEST_COMPLETED:"requestcompleted",REQUEST_FAILED:"requestfailed",REQUEST_CANCELLED:"requestcanceled",HEARTBEAT:"hb",DESTROY:"destroy"},lb=ob,db="mux-embed",ub="5.18.1",cb="2.1",Ee={},Ui=function(t){var e=arguments;typeof t=="string"?Ui.hasOwnProperty(t)?ln.default.setTimeout(function(){e=Array.prototype.splice.call(e,1),Ui[t].apply(null,e)},0):te.warn("`"+t+"` is an unknown task"):typeof t=="function"?ln.default.setTimeout(function(){t(Ui)},0):te.warn("`"+t+"` is invalid.")},hb={loaded:Ce.now(),NAME:db,VERSION:ub,API_VERSION:cb,PLAYER_TRACKED:!1,monitor:function(t,e){return Q_(Ui,t,e)},destroyMonitor:function(t){var e=fi(bo(t),1),i=e[0];i&&i.mux&&typeof i.mux.destroy=="function"?i.mux.destroy():te.error("A video element monitor for `"+t+"` has not been initialized via `mux.monitor`.")},addHLSJS:function(t,e){var i=ft(t);Ee[i]?Ee[i].addHLSJS(e):te.error("A monitor for `"+i+"` has not been initialized.")},addDashJS:function(t,e){var i=ft(t);Ee[i]?Ee[i].addDashJS(e):te.error("A monitor for `"+i+"` has not been initialized.")},removeHLSJS:function(t){var e=ft(t);Ee[e]?Ee[e].removeHLSJS():te.error("A monitor for `"+e+"` has not been initialized.")},removeDashJS:function(t){var e=ft(t);Ee[e]?Ee[e].removeDashJS():te.error("A monitor for `"+e+"` has not been initialized.")},init:function(t,e){Kl()&&e&&e.respectDoNotTrack&&te.info("The browser's Do Not Track flag is enabled - Mux beaconing is disabled.");var i=ft(t);Ee[i]=new Y_(Ui,i,e)},emit:function(t,e,i){var a=ft(t);Ee[a]?(Ee[a].emit(e,i),e==="destroy"&&delete Ee[a]):te.error("A monitor for `"+a+"` has not been initialized.")},updateData:function(t,e){var i=ft(t);Ee[i]?Ee[i].emit("hb",e):te.error("A monitor for `"+i+"` has not been initialized.")},setEmitTranslator:function(t,e){var i=ft(t);Ee[i]?Ee[i].emitTranslator=e:te.error("A monitor for `"+i+"` has not been initialized.")},setStateDataTranslator:function(t,e){var i=ft(t);Ee[i]?Ee[i].stateDataTranslator=e:te.error("A monitor for `"+i+"` has not been initialized.")},setGetPlayheadTime:function(t,e){var i=ft(t);Ee[i]?Ee[i].getPlayheadTime=e:te.error("A monitor for `"+i+"` has not been initialized.")},checkDoNotTrack:Kl,log:te,utils:sb,events:lb,WINDOW_HIDDEN:!1,WINDOW_UNLOADING:!1};Object.assign(Ui,hb);typeof ln.default<"u"&&typeof ln.default.addEventListener=="function"&&ln.default.addEventListener("pagehide",function(t){t.persisted||(Ui.WINDOW_UNLOADING=!0)},!1);var uu=Ui;var K=Bf,Z={VIDEO:"video",THUMBNAIL:"thumbnail",STORYBOARD:"storyboard",DRM:"drm"},x={NOT_AN_ERROR:0,NETWORK_OFFLINE:2000002,NETWORK_UNKNOWN_ERROR:2e6,NETWORK_NO_STATUS:2000001,NETWORK_INVALID_URL:24e5,NETWORK_NOT_FOUND:2404e3,NETWORK_NOT_READY:2412e3,NETWORK_GENERIC_SERVER_FAIL:25e5,NETWORK_TOKEN_MISSING:2403201,NETWORK_TOKEN_MALFORMED:2412202,NETWORK_TOKEN_EXPIRED:2403210,NETWORK_TOKEN_AUD_MISSING:2403221,NETWORK_TOKEN_AUD_MISMATCH:2403222,NETWORK_TOKEN_SUB_MISMATCH:2403232,ENCRYPTED_ERROR:5e6,ENCRYPTED_UNSUPPORTED_KEY_SYSTEM:5000001,ENCRYPTED_GENERATE_REQUEST_FAILED:5000002,ENCRYPTED_UPDATE_LICENSE_FAILED:5000003,ENCRYPTED_UPDATE_SERVER_CERT_FAILED:5000004,ENCRYPTED_CDM_ERROR:5000005,ENCRYPTED_OUTPUT_RESTRICTED:5000006,ENCRYPTED_MISSING_TOKEN:5000002},Jo=t=>t===Z.VIDEO?"playback":t,yi=class Pr extends Error{constructor(e,i=Pr.MEDIA_ERR_CUSTOM,a,r){var n;super(e),this.name="MediaError",this.code=i,this.context=r,this.fatal=a??(i>=Pr.MEDIA_ERR_NETWORK&&i<=Pr.MEDIA_ERR_ENCRYPTED),this.message||(this.message=(n=Pr.defaultMessages[this.code])!=null?n:"")}};yi.MEDIA_ERR_ABORTED=1,yi.MEDIA_ERR_NETWORK=2,yi.MEDIA_ERR_DECODE=3,yi.MEDIA_ERR_SRC_NOT_SUPPORTED=4,yi.MEDIA_ERR_ENCRYPTED=5,yi.MEDIA_ERR_CUSTOM=100,yi.defaultMessages={1:"You aborted the media playback",2:"A network error caused the media download to fail.",3:"A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.",4:"An unsupported error occurred. The server or network failed, or your browser does not support this format.",5:"The media is encrypted and there are no keys to decrypt it."};var I=yi,mb=t=>t==null,cu=(t,e)=>mb(e)?!1:t in e,Yl={ANY:"any",MUTED:"muted"},j={ON_DEMAND:"on-demand",LIVE:"live",UNKNOWN:"unknown"},Gt={MSE:"mse",NATIVE:"native"},$r={HEADER:"header",QUERY:"query",NONE:"none"},To=Object.values($r),mi={M3U8:"application/vnd.apple.mpegurl",MP4:"video/mp4"},ih={HLS:mi.M3U8};[...Object.values(mi)];var Tk={upTo720p:"720p",upTo1080p:"1080p",upTo1440p:"1440p",upTo2160p:"2160p"},Ak={noLessThan480p:"480p",noLessThan540p:"540p",noLessThan720p:"720p",noLessThan1080p:"1080p",noLessThan1440p:"1440p",noLessThan2160p:"2160p"},kk={DESCENDING:"desc"},pb="en",Gl={code:pb},ge=(t,e,i,a,r=t)=>{r.addEventListener(e,i,a),t.addEventListener("teardown",()=>{r.removeEventListener(e,i)},{once:!0})};function vb(t,e,i){e&&i>e&&(i=e);for(let a=0;a<t.length;a++)if(t.start(a)<=i&&t.end(a)>=i)return!0;return!1}var hu=t=>{let e=t.indexOf("?");if(e<0)return[t];let i=t.slice(0,e),a=t.slice(e);return[i,a]},el=t=>{let{type:e}=t;if(e){let i=e.toUpperCase();return cu(i,ih)?ih[i]:e}return fb(t)},Xm=t=>t==="VOD"?j.ON_DEMAND:j.LIVE,Jm=t=>t==="EVENT"?Number.POSITIVE_INFINITY:t==="VOD"?Number.NaN:0,fb=t=>{let{src:e}=t;if(!e)return"";let i="";try{i=mu(e).pathname}catch{console.error("Invalid url when trying to infer mime type",e)}let a=i.lastIndexOf(".");if(a<0)return bb(t)?mi.M3U8:"";let r=i.slice(a+1).toUpperCase();return cu(r,mi)?mi[r]:""},zl=t=>{try{return new URL(t),!1}catch{return!0}},Eb=t=>t.split(`
`).find((e,i,a)=>i>0&&a[i-1].startsWith("#EXT-X-STREAM-INF")),mu=(t,e)=>{var i;if(!zl(t))return new URL(t);let a=(i=window?.location)==null?void 0:i.href,r=e??a;return e&&zl(e.toString())&&(r=new URL(e,a)),new URL(t,r)},_b="mux.com",bb=({src:t,customDomain:e=_b})=>{let i;try{i=new URL(`${t}`)}catch{return!1}let a=i.protocol==="https:",r=i.hostname===`stream.${e}`.toLowerCase(),n=i.pathname.split("/"),s=n.length===2,o=!(n!=null&&n[1].includes("."));return a&&r&&s&&o},tr=t=>{let e=(t??"").split(".")[1];if(e)try{let i=e.replace(/-/g,"+").replace(/_/g,"/"),a=decodeURIComponent(atob(i).split("").map(function(r){return"%"+("00"+r.charCodeAt(0).toString(16)).slice(-2)}).join(""));return JSON.parse(a)}catch{return}},gb=({exp:t},e=Date.now())=>!t||t*1e3<e,yb=({sub:t},e)=>t!==e,Tb=({aud:t},e)=>!t,Ab=({aud:t},e)=>t!==e,ep="en";function O(t,e=!0){var i,a;let r=e&&(a=(i=Gl)==null?void 0:i[t])!=null?a:t,n=e?Gl.code:ep;return new kb(r,n)}var kb=class{constructor(e,i=(a=>(a=Gl)!=null?a:ep)()){this.message=e,this.locale=i}format(e){return this.message.replace(/\{(\w+)\}/g,(i,a)=>{var r;return(r=e[a])!=null?r:""})}toString(){return this.message}},Sb=Object.values(Yl),ah=t=>typeof t=="boolean"||typeof t=="string"&&Sb.includes(t),wb=(t,e,i)=>{let{autoplay:a}=t,r=!1,n=!1,s=ah(a)?a:!!a,o=()=>{r||ge(e,"playing",()=>{r=!0},{once:!0})};if(o(),ge(e,"loadstart",()=>{r=!1,o(),wl(e,s)},{once:!0}),ge(e,"loadstart",()=>{i||(t.streamType&&t.streamType!==j.UNKNOWN?n=t.streamType===j.LIVE:n=!Number.isFinite(e.duration)),wl(e,s)},{once:!0}),i&&i.once(K.Events.LEVEL_LOADED,(l,u)=>{var m;t.streamType&&t.streamType!==j.UNKNOWN?n=t.streamType===j.LIVE:n=(m=u.details.live)!=null?m:!1}),!s){let l=()=>{!n||Number.isFinite(t.startTime)||(i!=null&&i.liveSyncPosition?e.currentTime=i.liveSyncPosition:Number.isFinite(e.seekable.end(0))&&(e.currentTime=e.seekable.end(0)))};i&&ge(e,"play",()=>{e.preload==="metadata"?i.once(K.Events.LEVEL_UPDATED,l):l()},{once:!0})}return l=>{r||(s=ah(l)?l:!!l,wl(e,s))}},wl=(t,e)=>{if(!e)return;let i=t.muted,a=()=>t.muted=i;switch(e){case Yl.ANY:t.play().catch(()=>{t.muted=!0,t.play().catch(a)});break;case Yl.MUTED:t.muted=!0,t.play().catch(a);break;default:t.play().catch(()=>{});break}},Ib=({preload:t,src:e},i,a)=>{let r=p=>{p!=null&&["","none","metadata","auto"].includes(p)?i.setAttribute("preload",p):i.removeAttribute("preload")};if(!a)return r(t),r;let n=!1,s=!1,o=a.config.maxBufferLength,l=a.config.maxBufferSize,u=p=>{r(p);let h=p??i.preload;s||h==="none"||(h==="metadata"?(a.config.maxBufferLength=1,a.config.maxBufferSize=1):(a.config.maxBufferLength=o,a.config.maxBufferSize=l),m())},m=()=>{!n&&e&&(n=!0,a.loadSource(e))};return ge(i,"play",()=>{s=!0,a.config.maxBufferLength=o,a.config.maxBufferSize=l,m()},{once:!0}),u(t),u},Rb=(t,e,i)=>{let{minPreloadSegments:a}=t;if(a==null||a<=0||!i)return;let r=0,n=!1,s=e.playbackRate||1,o=()=>{e.playbackRate!==0&&(s=e.playbackRate,e.playbackRate=0)};e.playbackRate=0,ge(e,"ratechange",o);let l=(u,{frag:m})=>{n||m.type!=="main"||(r++,r>=a&&(n=!0,e.removeEventListener("ratechange",o),e.playbackRate=s))};i.on(K.Events.FRAG_BUFFERED,l),e.addEventListener("teardown",()=>{n||(n=!0,i.off(K.Events.FRAG_BUFFERED,l),e.playbackRate=s)},{once:!0})},Lb=(t,e,i)=>{let{initialEstimateSegments:a}=t;if(a==null||a<=0||!i)return;let r=0;i.on(K.Events.FRAG_BUFFERED,(n,{frag:s})=>{s.type==="main"&&(r++,r<a&&i.abrController.resetEstimator(i.config.abrEwmaDefaultEstimate))})};function Cb(t,e){var i;if(!("videoTracks"in t))return;let a=new WeakMap;e.on(K.Events.MANIFEST_PARSED,function(u,m){l();let p=t.addVideoTrack("main");p.selected=!0;for(let[h,d]of m.levels.entries()){let v=p.addRendition(d.url[0],d.width,d.height,d.videoCodec,d.bitrate);a.set(d,`${h}`),v.id=`${h}`}}),e.on(K.Events.AUDIO_TRACKS_UPDATED,function(u,m){o();for(let p of m.audioTracks){let h=p.default?"main":"alternative",d=t.addAudioTrack(h,p.name,p.lang);d.id=`${p.id}`,p.default&&(d.enabled=!0)}});let r=()=>{var u;let m=+((u=[...t.audioTracks].find(h=>h.enabled))==null?void 0:u.id),p=e.audioTracks.map(h=>h.id);m!=e.audioTrack&&p.includes(m)&&(e.audioTrack=m)};t.audioTracks.addEventListener("change",r),e.on(K.Events.LEVELS_UPDATED,function(u,m){var p;let h=t.videoTracks[(p=t.videoTracks.selectedIndex)!=null?p:0];if(!h)return;let d=m.levels.map(v=>a.get(v));for(let v of t.videoRenditions)v.id&&!d.includes(v.id)&&h.removeRendition(v)});let n=u=>{let m=u.target.selectedIndex;m!=e.nextLevel&&(e.nextLevel=m)};(i=t.videoRenditions)==null||i.addEventListener("change",n);let s=()=>{for(let u of t.videoTracks)t.removeVideoTrack(u)},o=()=>{for(let u of t.audioTracks)t.removeAudioTrack(u)},l=()=>{s(),o()};e.once(K.Events.DESTROYING,()=>{var u,m;l(),(u=t.audioTracks)==null||u.removeEventListener("change",r),(m=t.videoRenditions)==null||m.removeEventListener("change",n)})}var Il=t=>"time"in t?t.time:t.startTime;function Db(t,e){e.on(K.Events.NON_NATIVE_TEXT_TRACKS_FOUND,(r,{tracks:n})=>{n.forEach(s=>{var o,l;let u=(o=s.subtitleTrack)!=null?o:s.closedCaptions,m=e.subtitleTracks.findIndex(({lang:h,name:d,type:v})=>h==u?.lang&&d===s.label&&v.toLowerCase()===s.kind),p=((l=s._id)!=null?l:s.default)?"default":`${s.kind}${m}`;pu(t,s.kind,s.label,u?.lang,p,s.default)})});let i=()=>{if(!e.subtitleTracks.length)return;let r=Array.from(t.textTracks).find(o=>o.id&&o.mode==="showing"&&["subtitles","captions"].includes(o.kind));if(!r)return;let n=e.subtitleTracks[e.subtitleTrack],s=n?n.default?"default":`${e.subtitleTracks[e.subtitleTrack].type.toLowerCase()}${e.subtitleTrack}`:void 0;if(e.subtitleTrack<0||r?.id!==s){let o=e.subtitleTracks.findIndex(({lang:l,name:u,type:m,default:p})=>r.id==="default"&&p||l==r.language&&u===r.label&&m.toLowerCase()===r.kind);e.subtitleTrack=o}r?.id===s&&r.cues&&Array.from(r.cues).forEach(o=>{r.addCue(o)})};t.textTracks.addEventListener("change",i),e.on(K.Events.CUES_PARSED,(r,{track:n,cues:s})=>{let o=t.textTracks.getTrackById(n);if(!o)return;let l=o.mode==="disabled";l&&(o.mode="hidden"),s.forEach(u=>{var m;(m=o.cues)!=null&&m.getCueById(u.id)||o.addCue(u)}),l&&(o.mode="disabled")}),e.once(K.Events.DESTROYING,()=>{t.textTracks.removeEventListener("change",i),t.querySelectorAll("track[data-removeondestroy]").forEach(r=>{r.remove()})});let a=()=>{Array.from(t.textTracks).forEach(r=>{var n,s;if(!["subtitles","caption"].includes(r.kind)&&(r.label==="thumbnails"||r.kind==="chapters")){if(!((n=r.cues)!=null&&n.length)){let o="track";r.kind&&(o+=`[kind="${r.kind}"]`),r.label&&(o+=`[label="${r.label}"]`);let l=t.querySelector(o),u=(s=l?.getAttribute("src"))!=null?s:"";l?.removeAttribute("src"),setTimeout(()=>{l?.setAttribute("src",u)},0)}r.mode!=="hidden"&&(r.mode="hidden")}})};e.once(K.Events.MANIFEST_LOADED,a),e.once(K.Events.MEDIA_ATTACHED,a)}function pu(t,e,i,a,r,n){let s=document.createElement("track");return s.kind=e,s.label=i,a&&(s.srclang=a),r&&(s.id=r),n&&(s.default=!0),s.track.mode=["subtitles","captions"].includes(e)?"disabled":"hidden",s.setAttribute("data-removeondestroy",""),t.append(s),s.track}function Mb(t,e){let i=Array.prototype.find.call(t.querySelectorAll("track"),a=>a.track===e);i?.remove()}function Hn(t,e,i){var a;return(a=Array.from(t.querySelectorAll("track")).find(r=>r.track.label===e&&r.track.kind===i))==null?void 0:a.track}async function tp(t,e,i,a){let r=Hn(t,i,a);return r||(r=pu(t,a,i),r.mode="hidden",await new Promise(n=>setTimeout(()=>n(void 0),0))),r.mode!=="hidden"&&(r.mode="hidden"),[...e].sort((n,s)=>Il(s)-Il(n)).forEach(n=>{var s,o;let l=n.value,u=Il(n);if("endTime"in n&&n.endTime!=null)r?.addCue(new VTTCue(u,n.endTime,a==="chapters"?l:JSON.stringify(l??null)));else{let m=Array.prototype.findIndex.call(r?.cues,v=>v.startTime>=u),p=(s=r?.cues)==null?void 0:s[m],h=p?p.startTime:Number.isFinite(t.duration)?t.duration:Number.MAX_SAFE_INTEGER,d=(o=r?.cues)==null?void 0:o[m-1];d&&(d.endTime=u),r?.addCue(new VTTCue(u,h,a==="chapters"?l:JSON.stringify(l??null)))}}),t.textTracks.dispatchEvent(new Event("change",{bubbles:!0,composed:!0})),r}var vu="cuepoints",ip=Object.freeze({label:vu});async function ap(t,e,i=ip){return tp(t,e,i.label,"metadata")}var Ql=t=>({time:t.startTime,value:JSON.parse(t.text)});function Ob(t,e={label:vu}){let i=Hn(t,e.label,"metadata");return i!=null&&i.cues?Array.from(i.cues,a=>Ql(a)):[]}function rp(t,e={label:vu}){var i,a;let r=Hn(t,e.label,"metadata");if(!((i=r?.activeCues)!=null&&i.length))return;if(r.activeCues.length===1)return Ql(r.activeCues[0]);let{currentTime:n}=t,s=Array.prototype.find.call((a=r.activeCues)!=null?a:[],({startTime:o,endTime:l})=>o<=n&&l>n);return Ql(s||r.activeCues[0])}async function xb(t,e=ip){return new Promise(i=>{ge(t,"loadstart",async()=>{let a=await ap(t,[],e);ge(t,"cuechange",()=>{let r=rp(t);if(r){let n=new CustomEvent("cuepointchange",{composed:!0,bubbles:!0,detail:r});t.dispatchEvent(n)}},{},a),i(a)})})}var fu="chapters",np=Object.freeze({label:fu}),jl=t=>({startTime:t.startTime,endTime:t.endTime,value:t.text});async function sp(t,e,i=np){return tp(t,e,i.label,"chapters")}function Nb(t,e={label:fu}){var i;let a=Hn(t,e.label,"chapters");return(i=a?.cues)!=null&&i.length?Array.from(a.cues,r=>jl(r)):[]}function op(t,e={label:fu}){var i,a;let r=Hn(t,e.label,"chapters");if(!((i=r?.activeCues)!=null&&i.length))return;if(r.activeCues.length===1)return jl(r.activeCues[0]);let{currentTime:n}=t,s=Array.prototype.find.call((a=r.activeCues)!=null?a:[],({startTime:o,endTime:l})=>o<=n&&l>n);return jl(s||r.activeCues[0])}async function Pb(t,e=np){return new Promise(i=>{ge(t,"loadstart",async()=>{let a=await sp(t,[],e);ge(t,"cuechange",()=>{let r=op(t);if(r){let n=new CustomEvent("chapterchange",{composed:!0,bubbles:!0,detail:r});t.dispatchEvent(n)}},{},a),i(a)})})}function $b(t,e){if(e){let i=e.playingDate;if(i!=null)return new Date(i.getTime()-t.currentTime*1e3)}return typeof t.getStartDate=="function"?t.getStartDate():new Date(NaN)}function Ub(t,e){if(e&&e.playingDate)return e.playingDate;if(typeof t.getStartDate=="function"){let i=t.getStartDate();return new Date(i.getTime()+t.currentTime*1e3)}return new Date(NaN)}var un={VIDEO:"v",THUMBNAIL:"t",STORYBOARD:"s",DRM:"d"},Hb=t=>{if(t===Z.VIDEO)return un.VIDEO;if(t===Z.DRM)return un.DRM},Bb=(t,e)=>{var i,a;let r=Jo(t),n=`${r}Token`;return(i=e.tokens)!=null&&i[r]?(a=e.tokens)==null?void 0:a[r]:cu(n,e)?e[n]:void 0},Ao=(t,e,i,a,r=!1,n=!(s=>(s=globalThis.navigator)==null?void 0:s.onLine)())=>{var s,o;if(n){let y=O("Your device appears to be offline",r),T,g=I.MEDIA_ERR_NETWORK,k=new I(y,g,!1,T);return k.errorCategory=e,k.muxCode=x.NETWORK_OFFLINE,k.data=t,k}let l="status"in t?t.status:t.code,u=Date.now(),m=I.MEDIA_ERR_NETWORK;if(l===200)return;let p=Jo(e),h=Bb(e,i),d=Hb(e),[v]=hu((s=i.playbackId)!=null?s:"");if(!l||!v)return;let E=tr(h);if(h&&!E){let y=O("The {tokenNamePrefix}-token provided is invalid or malformed.",r).format({tokenNamePrefix:p}),T=O("Compact JWT string: {token}",r).format({token:h}),g=new I(y,m,!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_TOKEN_MALFORMED,g.data=t,g}if(l>=500){let y=new I("",m,a??!0);return y.errorCategory=e,y.muxCode=x.NETWORK_UNKNOWN_ERROR,y}if(l===403)if(E){if(gb(E,u)){let y={timeStyle:"medium",dateStyle:"medium"},T=O("The video’s secured {tokenNamePrefix}-token has expired.",r).format({tokenNamePrefix:p}),g=O("Expired at: {expiredDate}. Current time: {currentDate}.",r).format({expiredDate:new Intl.DateTimeFormat("en",y).format((o=E.exp)!=null?o:0*1e3),currentDate:new Intl.DateTimeFormat("en",y).format(u)}),k=new I(T,m,!0,g);return k.errorCategory=e,k.muxCode=x.NETWORK_TOKEN_EXPIRED,k.data=t,k}if(yb(E,v)){let y=O("The video’s playback ID does not match the one encoded in the {tokenNamePrefix}-token.",r).format({tokenNamePrefix:p}),T=O("Specified playback ID: {playbackId} and the playback ID encoded in the {tokenNamePrefix}-token: {tokenPlaybackId}",r).format({tokenNamePrefix:p,playbackId:v,tokenPlaybackId:E.sub}),g=new I(y,m,!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_TOKEN_SUB_MISMATCH,g.data=t,g}if(Tb(E)){let y=O("The {tokenNamePrefix}-token is formatted with incorrect information.",r).format({tokenNamePrefix:p}),T=O("The {tokenNamePrefix}-token has no aud value. aud value should be {expectedAud}.",r).format({tokenNamePrefix:p,expectedAud:d}),g=new I(y,m,!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_TOKEN_AUD_MISSING,g.data=t,g}if(Ab(E,d)){let y=O("The {tokenNamePrefix}-token is formatted with incorrect information.",r).format({tokenNamePrefix:p}),T=O("The {tokenNamePrefix}-token has an incorrect aud value: {aud}. aud value should be {expectedAud}.",r).format({tokenNamePrefix:p,expectedAud:d,aud:E.aud}),g=new I(y,m,!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_TOKEN_AUD_MISMATCH,g.data=t,g}}else{let y=O("Authorization error trying to access this {category} URL. If this is a signed URL, you might need to provide a {tokenNamePrefix}-token.",r).format({tokenNamePrefix:p,category:e}),T=O("Specified playback ID: {playbackId}",r).format({playbackId:v}),g=new I(y,m,a??!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_TOKEN_MISSING,g.data=t,g}if(l===412){let y=O("This playback-id may belong to a live stream that is not currently active or an asset that is not ready.",r),T=O("Specified playback ID: {playbackId}",r).format({playbackId:v}),g=new I(y,m,a??!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_NOT_READY,g.streamType=i.streamType===j.LIVE?"live":i.streamType===j.ON_DEMAND?"on-demand":"unknown",g.data=t,g}if(l===404){let y=O("This URL or playback-id does not exist. You may have used an Asset ID or an ID from a different resource.",r),T=O("Specified playback ID: {playbackId}",r).format({playbackId:v}),g=new I(y,m,a??!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_NOT_FOUND,g.data=t,g}if(l===400){let y=O("The URL or playback-id was invalid. You may have used an invalid value as a playback-id."),T=O("Specified playback ID: {playbackId}",r).format({playbackId:v}),g=new I(y,m,a??!0,T);return g.errorCategory=e,g.muxCode=x.NETWORK_INVALID_URL,g.data=t,g}let b=new I("",m,a??!0);return b.errorCategory=e,b.muxCode=x.NETWORK_UNKNOWN_ERROR,b.data=t,b},rh=K.DefaultConfig.capLevelController,Wb={"720p":921600,"1080p":2073600,"1440p":4194304,"2160p":8294400};function Fb(t){let e=t.toLowerCase().trim();return Wb[e]}var Zl=class Ur extends rh{constructor(e){super(e)}static setMaxAutoResolution(e,i){i?Ur.maxAutoResolution.set(e,i):Ur.maxAutoResolution.delete(e)}getMaxAutoResolution(){var e;let i=this.hls;return(e=Ur.maxAutoResolution.get(i))!=null?e:void 0}get levels(){var e;return(e=this.hls.levels)!=null?e:[]}getValidLevels(e){return this.levels.filter((i,a)=>this.isLevelAllowed(i)&&a<=e)}getMaxLevelCapped(e){let i=this.getValidLevels(e),a=this.getMaxAutoResolution();if(!a)return super.getMaxLevel(e);let r=Fb(a);if(!r)return super.getMaxLevel(e);let n=i.filter(l=>l.width*l.height<=r),s=n.findIndex(l=>l.width*l.height===r);if(s!==-1){let l=n[s];return i.findIndex(u=>u===l)}if(n.length===0)return 0;let o=n[n.length-1];return i.findIndex(l=>l===o)}getMaxLevel(e){if(this.getMaxAutoResolution()!==void 0)return this.getMaxLevelCapped(e);let i=super.getMaxLevel(e),a=this.getValidLevels(e);if(!a[i])return i;let r=Math.min(a[i].width,a[i].height),n=Ur.minMaxResolution;return r>=n?i:rh.getMaxLevelByMediaSize(a,n*(16/9),n)}};Zl.minMaxResolution=720,Zl.maxAutoResolution=new WeakMap;var Kb=Zl,Xl=Kb,Vb="com.apple.fps.1_0",qb="application/vnd.apple.mpegurl",Yb=({mediaEl:t,getAppCertificate:e,getLicenseKey:i,saveAndDispatchError:a,drmTypeCb:r})=>{if(!window.WebKitMediaKeys||!("onwebkitneedkey"in t)){console.error("No WebKitMediaKeys. FairPlay may not be supported");let h=O("Cannot play DRM-protected content with current security configuration on this browser. Try playing in another browser."),d=new I(h,I.MEDIA_ERR_ENCRYPTED,!0);return d.errorCategory=Z.DRM,d.muxCode=x.ENCRYPTED_CDM_ERROR,a(t,d),()=>{}}let n=t,s=e(),o=null,l=h=>{(async()=>{try{n.webkitKeys||u();let d=await s;if(h.initData===null||d==null)return;let v=Gb(h.initData,d);m(v)}catch(d){console.error("Could not start encrypted playback due to exception",d),a(n,d)}})()},u=()=>{try{let h=new WebKitMediaKeys(Vb);n.webkitSetMediaKeys(h),r()}catch{let h="Cannot play DRM-protected content with current security configuration on this browser. Try playing in another browser.",d=new I(h,I.MEDIA_ERR_ENCRYPTED,!0);throw d.errorCategory=Z.DRM,d.muxCode=x.ENCRYPTED_UNSUPPORTED_KEY_SYSTEM,d}},m=h=>{let d=n.webkitKeys.createSession(qb,h),v=async y=>{try{let T=y.message,g=await i(T);d.update(g)}catch(T){console.error("Error on FairPlay session message",T),a(t,T)}},E=y=>{let T=y.target.error;if(!T)return;console.error(`Internal Webkit Key Session Error - sysCode: ${T.systemCode} code: ${T.code}`);let g=O("The DRM Content Decryption Module system had an internal failure. Try reloading the page, upading your browser, or playing in another browser."),k=new I(g,I.MEDIA_ERR_ENCRYPTED,!0);k.errorCategory=Z.DRM,k.muxCode=x.ENCRYPTED_CDM_ERROR,a(t,k)},b=()=>{d.removeEventListener("webkitkeymessage",v),d.removeEventListener("webkitkeyerror",E),t.removeEventListener("teardown",b),"webkitCurrentPlaybackTargetIsWireless"in t&&t.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged",b),o=null;try{d.close()}catch{}};"webkitCurrentPlaybackTargetIsWireless"in t&&t.addEventListener("webkitcurrentplaybacktargetiswirelesschanged",b,{once:!0}),d.addEventListener("webkitkeymessage",v),d.addEventListener("webkitkeyerror",E),t.addEventListener("teardown",b),o=b},p=()=>{t.removeEventListener("webkitneedkey",l),t.removeEventListener("teardown",p),o?.();try{n.webkitSetMediaKeys(null)}catch{}};return t.addEventListener("webkitneedkey",l),t.addEventListener("teardown",p,{once:!0}),p},Gb=(t,e)=>{let i=Qb(zb(t)),a=new Uint8Array(t),r=new Uint8Array(i),n=new Uint8Array(e),s=a.byteLength+4+n.byteLength+4+r.byteLength,o=new Uint8Array(s),l=0,u=p=>{o.set(p,l),l+=p.byteLength},m=p=>{let h=new DataView(o.buffer),d=p.byteLength;h.setUint32(l,d,!0),l+=4,u(p)};return u(a),m(r),m(n),o},zb=t=>new TextDecoder("utf-16le").decode(t).replace("skd://","").slice(1);function Qb(t){let e=new ArrayBuffer(t.length*2),i=new DataView(e);for(let a=0;a<t.length;a++)i.setUint16(a*2,t.charCodeAt(a),!0);return e}var jb=({mediaEl:t,getAppCertificate:e,getLicenseKey:i,saveAndDispatchError:a,drmTypeCb:r,fallbackToWebkitFairplay:n})=>{let s=null,o=async p=>{try{let h=p.initDataType;if(h!=="skd"){console.error(`Received unexpected initialization data type "${h}"`);return}t.mediaKeys||await l(h);let d=p.initData;if(d==null){console.error(`Could not start encrypted playback due to missing initData in ${p.type} event`);return}await u(h,d)}catch(h){a(t,h);return}},l=async p=>{let h=await navigator.requestMediaKeySystemAccess("com.apple.fps",[{initDataTypes:[p],videoCapabilities:[{contentType:"application/vnd.apple.mpegurl",robustness:""}],distinctiveIdentifier:"not-allowed",persistentState:"not-allowed",sessionTypes:["temporary"]}]).then(v=>(r(),v)).catch(()=>{let v=O("Cannot play DRM-protected content with current security configuration on this browser. Try playing in another browser."),E=new I(v,I.MEDIA_ERR_ENCRYPTED,!0);E.errorCategory=Z.DRM,E.muxCode=x.ENCRYPTED_UNSUPPORTED_KEY_SYSTEM,a(t,E)});if(!h)return;let d=await h.createMediaKeys();try{let v=await e();await d.setServerCertificate(v).catch(()=>{let E=O("Your server certificate failed when attempting to set it. This may be an issue with a no longer valid certificate."),b=new I(E,I.MEDIA_ERR_ENCRYPTED,!0);return b.errorCategory=Z.DRM,b.muxCode=x.ENCRYPTED_UPDATE_SERVER_CERT_FAILED,Promise.reject(b)})}catch(v){a(t,v);return}await t.setMediaKeys(d)},u=async(p,h)=>{let d=t.mediaKeys.createSession(),v=async y=>{let T=y.message,g=await i(T);try{await d.update(g)}catch{let k=O("Failed to update DRM license. This may be an issue with the player or your protected content."),D=new I(k,I.MEDIA_ERR_ENCRYPTED,!0);D.errorCategory=Z.DRM,D.muxCode=x.ENCRYPTED_UPDATE_LICENSE_FAILED,a(t,D)}},E=()=>{let y=T=>{let g;if(T==="internal-error"){let k=O("The DRM Content Decryption Module system had an internal failure. Try reloading the page, upading your browser, or playing in another browser.");g=new I(k,I.MEDIA_ERR_ENCRYPTED,!0),g.errorCategory=Z.DRM,g.muxCode=x.ENCRYPTED_CDM_ERROR}else if(T==="output-restricted"||T==="output-downscaled"){let k=O("DRM playback is being attempted in an environment that is not sufficiently secure. User may see black screen.");g=new I(k,I.MEDIA_ERR_ENCRYPTED,!1),g.errorCategory=Z.DRM,g.muxCode=x.ENCRYPTED_OUTPUT_RESTRICTED}g&&a(t,g)};d.keyStatuses.forEach(T=>y(T))};d.addEventListener("keystatuseschange",E),d.addEventListener("message",v);let b=async()=>{d.removeEventListener("keystatuseschange",E),d.removeEventListener("message",v),"webkitCurrentPlaybackTargetIsWireless"in t&&t.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged",b),t.removeEventListener("teardown",b),await d.close().catch(y=>{console.warn("There was an error when closing EME session",y)}),s=null};"webkitCurrentPlaybackTargetIsWireless"in t&&t.addEventListener("webkitcurrentplaybacktargetiswirelesschanged",b,{once:!0}),t.addEventListener("teardown",b,{once:!0}),s=b,await d.generateRequest(p,h).catch(async y=>{if(y.name==="NotSupportedError"&&"webkitCurrentPlaybackTargetIsWireless"in t&&t.webkitCurrentPlaybackTargetIsWireless)console.warn("Failed to generate a DRM license request. Attempting to fallback to Webkit DRM"),n?.();else{let T=O("Failed to generate a DRM license request. This may be an issue with the player or your protected content."),g=new I(T,I.MEDIA_ERR_ENCRYPTED,!0);return g.errorCategory=Z.DRM,g.muxCode=x.ENCRYPTED_GENERATE_REQUEST_FAILED,console.error("Failed to generate license request",y),Promise.reject(g)}})},m=async()=>{t.removeEventListener("encrypted",o),t.removeEventListener("teardown",m),s&&await s(),await t.setMediaKeys(null).catch(()=>{})};return t.addEventListener("encrypted",o),t.addEventListener("teardown",m,{once:!0}),m},ls={FAIRPLAY:"fairplay",PLAYREADY:"playready",WIDEVINE:"widevine"},Zb=t=>{if(t.includes("fps"))return ls.FAIRPLAY;if(t.includes("playready"))return ls.PLAYREADY;if(t.includes("widevine"))return ls.WIDEVINE},Xb=(t,e)=>{let i=Eb(t);if(!i)return Promise.reject(new Error("No media playlist URL found in multivariant playlist"));if(zl(i)&&!e)return Promise.reject(new Error("masterPlaylistUrl is required to resolve relative media playlist URL"));let a;try{a=mu(i,e)}catch(r){return Promise.reject(r)}return fetch(a).then(r=>r.status!==200?Promise.reject(r):r.text())},Jb=t=>{let e=t.split(`
`).filter(a=>a.startsWith("#EXT-X-SESSION-DATA"));if(!e.length)return{};let i={};for(let a of e){let r=tg(a),n=r["DATA-ID"];n&&(i[n]={...r})}return{sessionData:i}},eg=/([A-Z0-9-]+)="?(.*?)"?(?:,|$)/g;function tg(t){let e=[...t.matchAll(eg)];return Object.fromEntries(e.map(([,i,a])=>[i,a]))}var ig=t=>{var e,i,a;let r=t.split(`
`),n=(i=((e=r.find(u=>u.startsWith("#EXT-X-PLAYLIST-TYPE")))!=null?e:"").split(":")[1])==null?void 0:i.trim(),s=Xm(n),o=Jm(n),l;if(s===j.LIVE){let u=r.find(m=>m.startsWith("#EXT-X-PART-INF"));if(u)l=+u.split(":")[1].split("=")[1]*2;else{let m=r.find(h=>h.startsWith("#EXT-X-TARGETDURATION")),p=(a=m?.split(":"))==null?void 0:a[1];l=+(p??6)*3}}return{streamType:s,targetLiveWindow:o,liveEdgeStartOffset:l}},ag=async(t,e)=>{if(e===mi.MP4)return{streamType:j.ON_DEMAND,targetLiveWindow:Number.NaN,liveEdgeStartOffset:void 0,sessionData:void 0};if(e===mi.M3U8){let i=await fetch(t);if(!i.ok)return Promise.reject(i);let a=await i.text(),r=await Xb(a,i.url);return{...Jb(a),...ig(r)}}return console.error(`Media type ${e} is an unrecognized or unsupported type for src ${t}.`),{streamType:void 0,targetLiveWindow:void 0,liveEdgeStartOffset:void 0,sessionData:void 0}},rg=async(t,e,i=el({src:t}))=>{var a,r,n,s;let{streamType:o,targetLiveWindow:l,liveEdgeStartOffset:u,sessionData:m}=await ag(t,i),p=m?.["com.apple.hls.chapters"];(p!=null&&p.URI||p!=null&&p.VALUE.toLocaleLowerCase().startsWith("http"))&&Eu((a=p.URI)!=null?a:p.VALUE,e),((r=se.get(e))!=null?r:{}).liveEdgeStartOffset=u,((n=se.get(e))!=null?n:{}).targetLiveWindow=l,e.dispatchEvent(new CustomEvent("targetlivewindowchange",{composed:!0,bubbles:!0})),((s=se.get(e))!=null?s:{}).streamType=o,e.dispatchEvent(new CustomEvent("streamtypechange",{composed:!0,bubbles:!0}))},Eu=async(t,e)=>{var i,a;try{let r=await fetch(t);if(!r.ok)throw new Error(`Failed to fetch Mux metadata: ${r.status} ${r.statusText}`);let n=await r.json(),s={};if(!((i=n?.[0])!=null&&i.metadata))return;for(let l of n[0].metadata)l.key&&l.value&&(s[l.key]=l.value);((a=se.get(e))!=null?a:{}).metadata=s;let o=new CustomEvent("muxmetadata");e.dispatchEvent(o)}catch(r){console.error(r)}},ng=t=>{var e;let i=t.type,a=Xm(i),r=Jm(i),n,s=!!((e=t.partList)!=null&&e.length);return a===j.LIVE&&(n=s?t.partTarget*2:t.targetduration*3),{streamType:a,targetLiveWindow:r,liveEdgeStartOffset:n,lowLatency:s}},sg=(t,e,i)=>{var a,r,n,s,o,l,u,m;let{streamType:p,targetLiveWindow:h,liveEdgeStartOffset:d,lowLatency:v}=ng(t);if(p===j.LIVE){v?(i.config.backBufferLength=(a=i.userConfig.backBufferLength)!=null?a:4,i.config.maxFragLookUpTolerance=(r=i.userConfig.maxFragLookUpTolerance)!=null?r:.001,i.config.abrBandWidthUpFactor=(n=i.userConfig.abrBandWidthUpFactor)!=null?n:i.config.abrBandWidthFactor):i.config.backBufferLength=(s=i.userConfig.backBufferLength)!=null?s:8;let E=Object.freeze({get length(){return e.seekable.length},start(b){return e.seekable.start(b)},end(b){var y;return b>this.length||b<0||Number.isFinite(e.duration)?e.seekable.end(b):(y=i.liveSyncPosition)!=null?y:e.seekable.end(b)}});((o=se.get(e))!=null?o:{}).seekable=E}((l=se.get(e))!=null?l:{}).liveEdgeStartOffset=d,((u=se.get(e))!=null?u:{}).targetLiveWindow=h,e.dispatchEvent(new CustomEvent("targetlivewindowchange",{composed:!0,bubbles:!0})),((m=se.get(e))!=null?m:{}).streamType=p,e.dispatchEvent(new CustomEvent("streamtypechange",{composed:!0,bubbles:!0}))},nh,sh,lp=(sh=(nh=globalThis?.navigator)==null?void 0:nh.userAgent)!=null?sh:"",oh,lh,dh,og=(dh=(lh=(oh=globalThis?.navigator)==null?void 0:oh.userAgentData)==null?void 0:lh.platform)!=null?dh:"",lg=lp.toLowerCase().includes("android")||["x11","android"].some(t=>og.toLowerCase().includes(t)),dg=t=>/^((?!chrome|android).)*safari/i.test(lp)&&!!t.canPlayType("application/vnd.apple.mpegurl"),se=new WeakMap,pi="mux.com",uh,ch,dp=(ch=(uh=K).isSupported)==null?void 0:ch.call(uh),ug=t=>lg||!dg(t),_u=()=>{if(typeof window<"u")return uu.utils.now()},cg=uu.utils.generateUUID,Jl=({playbackId:t,customDomain:e=pi,maxResolution:i,minResolution:a,renditionOrder:r,programStartTime:n,programEndTime:s,assetStartTime:o,assetEndTime:l,playbackToken:u,tokens:{playback:m=u}={},extraSourceParams:p={}}={})=>{if(!t)return;let[h,d=""]=hu(t),v=new URL(`https://stream.${e}/${h}.m3u8${d}`);return m||v.searchParams.has("token")?(v.searchParams.forEach((E,b)=>{b!="token"&&v.searchParams.delete(b)}),m&&v.searchParams.set("token",m)):(i&&v.searchParams.set("max_resolution",i),a&&(v.searchParams.set("min_resolution",a),i&&+i.slice(0,-1)<+a.slice(0,-1)&&console.error("minResolution must be <= maxResolution","minResolution",a,"maxResolution",i)),r&&v.searchParams.set("rendition_order",r),n&&v.searchParams.set("program_start_time",`${n}`),s&&v.searchParams.set("program_end_time",`${s}`),o&&v.searchParams.set("asset_start_time",`${o}`),l&&v.searchParams.set("asset_end_time",`${l}`),Object.entries(p).forEach(([E,b])=>{b!=null&&v.searchParams.set(E,b)})),v.toString()},tl=t=>{if(!t)return;let[e]=t.split("?");return e||void 0},bu=t=>{if(!t||!t.startsWith("https://stream."))return;let[e]=new URL(t).pathname.slice(1).split(/\.m3u8|\//);return e||void 0},hg=t=>{var e,i,a;return(e=t?.metadata)!=null&&e.video_id?t.metadata.video_id:_p(t)&&(a=(i=tl(t.playbackId))!=null?i:bu(t.src))!=null?a:t.src},up=t=>{var e;return(e=se.get(t))==null?void 0:e.error},mg=t=>{var e;return(e=se.get(t))==null?void 0:e.metadata},ed=t=>{var e,i;return(i=(e=se.get(t))==null?void 0:e.streamType)!=null?i:j.UNKNOWN},pg=t=>{var e,i;return(i=(e=se.get(t))==null?void 0:e.targetLiveWindow)!=null?i:Number.NaN},gu=t=>{var e,i;return(i=(e=se.get(t))==null?void 0:e.seekable)!=null?i:t.seekable},vg=t=>{var e;let i=(e=se.get(t))==null?void 0:e.liveEdgeStartOffset;if(typeof i!="number")return Number.NaN;let a=gu(t);return a.length?a.end(a.length-1)-i:Number.NaN},fg=t=>{var e;return(e=se.get(t))==null?void 0:e.coreReference},yu=.034,Eg=(t,e,i=yu)=>Math.abs(t-e)<=i,cp=(t,e,i=yu)=>t>e||Eg(t,e,i),_g=(t,e=yu)=>t.paused&&cp(t.currentTime,t.duration,e),hp=(t,e)=>{var i,a,r;if(!e||!t.buffered.length)return;if(t.readyState>2)return!1;let n=e.currentLevel>=0?(a=(i=e.levels)==null?void 0:i[e.currentLevel])==null?void 0:a.details:(r=e.levels.find(p=>!!p.details))==null?void 0:r.details;if(!n||n.live)return;let{fragments:s}=n;if(!(s!=null&&s.length))return;if(t.currentTime<t.duration-(n.targetduration+.5))return!1;let o=s[s.length-1];if(t.currentTime<=o.start)return!1;let l=o.start+o.duration/2,u=t.buffered.start(t.buffered.length-1),m=t.buffered.end(t.buffered.length-1);return l>u&&l<m},mp=(t,e)=>t.ended||t.loop?t.ended:e&&hp(t,e)?!0:_g(t),pp=(t,e,i)=>{vp(e,i,t);let{metadata:a={}}=t,{view_session_id:r=cg()}=a,n=hg(t);a.view_session_id=r,a.video_id=n,t.metadata=a;let s=h=>{var d;(d=e.mux)==null||d.emit("hb",{view_drm_type:h})};t.drmTypeCb=s,t.fallbackToWebkitFairplay=async()=>{var h;let d=!e.paused,v=e.currentTime;t.useWebkitFairplay=!0;let E=t.muxDataKeepSession;t.muxDataKeepSession=!0;let b=(h=se.get(e))==null?void 0:h.coreReference;pp(t,e,b),t.muxDataKeepSession=E,t.useWebkitFairplay=!1,d&&await e.play().then(()=>{e.currentTime=v}).catch(()=>{}),e.currentTime=v},se.set(e,{retryCount:0});let o=bg(t,e),l=Ib(t,e,o);t!=null&&t.muxDataKeepSession&&e!=null&&e.mux&&!e.mux.deleted?o&&e.mux.addHLSJS({hlsjs:o,Hls:o?K:void 0}):wg(t,e,o),Ig(t,e,o),xb(e),Pb(e);let u=wb(t,e,o);Rb(t,e,o),Lb(t,e,o);let m={engine:o,setAutoplay:u,setPreload:l},p=se.get(e);return p&&(p.coreReference=m),m},vp=(t,e,i)=>{let a=e?.engine;t!=null&&t.mux&&!t.mux.deleted&&(i!=null&&i.muxDataKeepSession?a&&t.mux.removeHLSJS():(t.mux.destroy(),delete t.mux)),a&&(a.detachMedia(),a.destroy()),t&&(t.hasAttribute("src")&&(t.removeAttribute("src"),t.load()),t.removeEventListener("error",gp),t.removeEventListener("error",td),t.removeEventListener("durationchange",bp),se.delete(t),t.dispatchEvent(new Event("teardown")))};function fp(t,e){var i;let a=el(t);if(a!==mi.M3U8)return!0;let r=!a||((i=e.canPlayType(a))!=null?i:!0),{preferPlayback:n}=t,s=n===Gt.MSE,o=n===Gt.NATIVE,l=dp&&(s||ug(e));return r&&(o||!l)}var bg=(t,e)=>{let{debug:i,streamType:a,startTime:r=-1,metadata:n,preferCmcd:s,_hlsConfig:o={},maxAutoResolution:l,initialBandwidthEstimateKbps:u}=t,m=el(t)===mi.M3U8,p=fp(t,e);if(m&&!p&&dp){let h={backBufferLength:30,renderTextTracksNatively:!1,liveDurationInfinity:!0,capLevelOnFPSDrop:!0,...u!=null?{abrEwmaDefaultEstimate:u*1e3}:{}},d=gg(a),v=yg(t),E=[$r.QUERY,$r.HEADER].includes(s)?{useHeaders:s===$r.HEADER,sessionId:n?.view_session_id,contentId:n?.video_id}:void 0,b=Sg(t),y=new K({debug:i,startPosition:r,cmcd:E,xhrSetup:(T,g)=>{var k,D;if(s&&s!==$r.QUERY)return;let C=mu(g);if(!C.searchParams.has("CMCD"))return;let $=((D=(k=C.searchParams.get("CMCD"))==null?void 0:k.split(","))!=null?D:[]).filter(B=>B.startsWith("sid")||B.startsWith("cid")).join(",");C.searchParams.set("CMCD",$),T.open("GET",C)},...h,...b,...d,...v,...o});return b.capLevelController===Xl&&l!==void 0&&Xl.setMaxAutoResolution(y,l),y.on(K.Events.MANIFEST_PARSED,async function(T,g){var k,D;let C=(k=g.sessionData)==null?void 0:k["com.apple.hls.chapters"];(C!=null&&C.URI||C!=null&&C.VALUE.toLocaleLowerCase().startsWith("http"))&&Eu((D=C?.URI)!=null?D:C?.VALUE,e)}),y}},gg=t=>t===j.LIVE?{backBufferLength:8}:{},yg=t=>{let{tokens:{drm:e}={},playbackId:i,drmTypeCb:a}=t,r=tl(i);return!e||!r?{}:{emeEnabled:!0,drmSystems:{"com.apple.fps":{licenseUrl:ds(t,"fairplay"),serverCertificateUrl:Ep(t,"fairplay")},"com.widevine.alpha":{licenseUrl:ds(t,"widevine")},"com.microsoft.playready":{licenseUrl:ds(t,"playready")}},requestMediaKeySystemAccessFunc:(n,s)=>(n==="com.widevine.alpha"&&(s=[...s.map(o=>{var l;let u=(l=o.videoCapabilities)==null?void 0:l.map(m=>({...m,robustness:"HW_SECURE_ALL"}));return{...o,videoCapabilities:u}}),...s]),navigator.requestMediaKeySystemAccess(n,s).then(o=>{let l=Zb(n);return a?.(l),o}))}},Tg=async t=>{let e=await fetch(t);return e.status!==200?Promise.reject(e):await e.arrayBuffer()},Ag=async(t,e)=>{let i=await fetch(e,{method:"POST",headers:{"Content-type":"application/octet-stream"},body:t});if(i.status!==200)return Promise.reject(i);let a=await i.arrayBuffer();return new Uint8Array(a)},kg=(t,e)=>{let i={mediaEl:e,getAppCertificate:()=>Tg(Ep(t,"fairplay")).catch(a=>{if(a instanceof Response){let r=Ao(a,Z.DRM,t);return console.error("mediaError",r?.message,r?.context),r?Promise.reject(r):Promise.reject(new Error("Unexpected error in app cert request"))}return Promise.reject(a)}),getLicenseKey:a=>Ag(a,ds(t,"fairplay")).catch(r=>{if(r instanceof Response){let n=Ao(r,Z.DRM,t);return console.error("mediaError",n?.message,n?.context),n?Promise.reject(n):Promise.reject(new Error("Unexpected error in license key request"))}return Promise.reject(r)}),saveAndDispatchError:xi,drmTypeCb:()=>{var a;(a=t.drmTypeCb)==null||a.call(t,ls.FAIRPLAY)}};if(t.useWebkitFairplay)Yb(i);else{let a={fallbackToWebkitFairplay:async()=>{var n;await r(),(n=t.fallbackToWebkitFairplay)==null||n.call(t)},...i},r=jb(a)}},ds=({playbackId:t,tokens:{drm:e}={},customDomain:i=pi},a)=>{let r=tl(t);return`https://license.${i.toLocaleLowerCase().endsWith(pi)?i:pi}/license/${a}/${r}?token=${e}`},Ep=({playbackId:t,tokens:{drm:e}={},customDomain:i=pi},a)=>{let r=tl(t);return`https://license.${i.toLocaleLowerCase().endsWith(pi)?i:pi}/appcert/${a}/${r}?token=${e}`},_p=({playbackId:t,src:e,customDomain:i})=>{if(t)return!0;if(typeof e!="string")return!1;let a=window?.location.href,r=new URL(e,a).hostname.toLocaleLowerCase();return r.includes(pi)||!!i&&r.includes(i.toLocaleLowerCase())},Sg=(t,e)=>{let i={};return i.capLevelToPlayerSize=t.capRenditionToPlayerSize,i.capLevelToPlayerSize==null?(i.capLevelController=Xl,i.capLevelToPlayerSize=!0):i.capLevelController=Wf,i},wg=(t,e,i)=>{var a;let{envKey:r,disableTracking:n,muxDataSDK:s=uu,muxDataSDKOptions:o={}}=t,l=_p(t);if(!n&&(r||l)){let{playerInitTime:u,playerSoftwareName:m,playerSoftwareVersion:p,beaconCollectionDomain:h,debug:d,disableCookies:v}=t,E={...t.metadata,video_title:((a=t?.metadata)==null?void 0:a.video_title)||void 0},b=y=>typeof y.player_error_code=="string"?!1:typeof t.errorTranslator=="function"?t.errorTranslator(y):y;s.monitor(e,{debug:d,beaconCollectionDomain:h,hlsjs:i,Hls:i?K:void 0,automaticErrorTracking:!1,errorTranslator:b,disableCookies:v,...o,data:{...r?{env_key:r}:{},player_software_name:m,player_software:m,player_software_version:p,player_init_time:u,...E}})}},Ig=(t,e,i)=>{var a,r;let n=fp(t,e),{src:s,customDomain:o=pi}=t,l=()=>{e.ended||t.disablePseudoEnded||!mp(e,i)||(hp(e,i)?e.currentTime=e.buffered.end(e.buffered.length-1):e.dispatchEvent(new Event("ended")))},u,m,p=()=>{let h=gu(e),d,v;h.length>0&&(d=h.start(0),v=h.end(0)),(m!==v||u!==d)&&e.dispatchEvent(new CustomEvent("seekablechange",{composed:!0})),u=d,m=v};if(ge(e,"durationchange",p),e&&n){let h=el(t);if(typeof s=="string"){if(s.endsWith(".mp4")&&s.includes(o)){let E=bu(s),b=new URL(`https://stream.${o}/${E}/metadata.json`);Eu(b.toString(),e)}let d=()=>{if(ed(e)!==j.LIVE||Number.isFinite(e.duration))return;let E=setInterval(p,1e3);e.addEventListener("teardown",()=>{clearInterval(E)},{once:!0}),ge(e,"durationchange",()=>{Number.isFinite(e.duration)&&clearInterval(E)})},v=async()=>rg(s,e,h).then(d).catch(E=>{if(E instanceof Response){let b=Ao(E,Z.VIDEO,t);if(b){xi(e,b);return}}});if(e.preload==="none"){let E=()=>{v(),e.removeEventListener("loadedmetadata",b)},b=()=>{v(),e.removeEventListener("play",E)};ge(e,"play",E,{once:!0}),ge(e,"loadedmetadata",b,{once:!0})}else v();(a=t.tokens)!=null&&a.drm?kg(t,e):ge(e,"encrypted",()=>{let E=O("Attempting to play DRM-protected content without providing a DRM token."),b=new I(E,I.MEDIA_ERR_ENCRYPTED,!0);b.errorCategory=Z.DRM,b.muxCode=x.ENCRYPTED_MISSING_TOKEN,xi(e,b)},{once:!0}),e.setAttribute("src",s),t.startTime&&(((r=se.get(e))!=null?r:{}).startTime=t.startTime,e.addEventListener("durationchange",bp,{once:!0}))}else e.removeAttribute("src");e.addEventListener("error",gp),e.addEventListener("error",td),e.addEventListener("emptied",()=>{e.querySelectorAll("track[data-removeondestroy]").forEach(d=>{d.remove()})},{once:!0}),ge(e,"pause",l),ge(e,"seeked",l),ge(e,"play",()=>{e.ended||cp(e.currentTime,e.duration)&&(e.currentTime=e.seekable.length?e.seekable.start(0):0)})}else i&&s?(i.once(K.Events.LEVEL_LOADED,(h,d)=>{sg(d.details,e,i),p(),ed(e)===j.LIVE&&!Number.isFinite(e.duration)&&(i.on(K.Events.LEVEL_UPDATED,p),ge(e,"durationchange",()=>{Number.isFinite(e.duration)&&i.off(K.Events.LEVELS_UPDATED,p)}))}),i.on(K.Events.ERROR,(h,d)=>{var v,E;let b=Rg(d,t);if(b.muxCode===x.NETWORK_NOT_READY){let y=(v=se.get(e))!=null?v:{},T=(E=y.retryCount)!=null?E:0;if(T<6){let g=T===0?5e3:6e4,k=new I(`Retrying in ${g/1e3} seconds...`,b.code,b.fatal);Object.assign(k,b),xi(e,k);let D=setTimeout(()=>{y.retryCount=T+1,d.details==="manifestLoadError"&&d.url&&i.loadSource(d.url)},g);e.addEventListener("teardown",()=>clearTimeout(D),{once:!0});return}else{y.retryCount=0;let g=new I('Try again later or <a href="#" onclick="window.location.reload(); return false;" style="color: #4a90e2;">click here to retry</a>',b.code,b.fatal);Object.assign(g,b),xi(e,g);return}}xi(e,b)}),i.on(K.Events.MANIFEST_LOADED,()=>{let h=se.get(e);h&&h.error&&(h.error=null,h.retryCount=0,e.dispatchEvent(new Event("emptied")),e.dispatchEvent(new Event("loadstart")))}),e.addEventListener("error",td),ge(e,"waiting",l),Cb(t,i),Db(e,i),i.attachMedia(e)):console.error("It looks like the video you're trying to play will not work on this system! If possible, try upgrading to the newest versions of your browser or software.")};function bp(t){var e;let i=t.target,a=(e=se.get(i))==null?void 0:e.startTime;if(a&&vb(i.seekable,i.duration,a)){let r=i.preload==="auto";r&&(i.preload="none"),i.currentTime=a,r&&(i.preload="auto")}}async function gp(t){if(!t.isTrusted)return;t.stopImmediatePropagation();let e=t.target;if(!(e!=null&&e.error))return;let{message:i,code:a}=e.error,r=new I(i,a);if(e.src&&a===I.MEDIA_ERR_SRC_NOT_SUPPORTED&&e.readyState===HTMLMediaElement.HAVE_NOTHING){setTimeout(()=>{var n;let s=(n=up(e))!=null?n:e.error;s?.code===I.MEDIA_ERR_SRC_NOT_SUPPORTED&&xi(e,r)},500);return}if(e.src&&(a!==I.MEDIA_ERR_DECODE||a!==void 0))try{let{status:n}=await fetch(e.src);r.data={response:{code:n}}}catch{}xi(e,r)}function xi(t,e){var i;e.fatal&&(((i=se.get(t))!=null?i:{}).error=e,t.dispatchEvent(new CustomEvent("error",{detail:e})))}function td(t){var e,i;if(!(t instanceof CustomEvent)||!(t.detail instanceof I))return;let a=t.target,r=t.detail;!r||!r.fatal||(((e=se.get(a))!=null?e:{}).error=r,(i=a.mux)==null||i.emit("error",{player_error_code:r.code,player_error_message:r.message,player_error_context:r.context}))}var Rg=(t,e)=>{var i,a,r;t.fatal?console.error("getErrorFromHlsErrorData()",t):e.debug&&console.warn("getErrorFromHlsErrorData() (non-fatal)",t);let n={[K.ErrorTypes.NETWORK_ERROR]:I.MEDIA_ERR_NETWORK,[K.ErrorTypes.MEDIA_ERROR]:I.MEDIA_ERR_DECODE,[K.ErrorTypes.KEY_SYSTEM_ERROR]:I.MEDIA_ERR_ENCRYPTED},s=m=>[K.ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED,K.ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED].includes(m.details)?I.MEDIA_ERR_NETWORK:n[m.type],o=m=>{if(m.type===K.ErrorTypes.KEY_SYSTEM_ERROR)return Z.DRM;if(m.type===K.ErrorTypes.NETWORK_ERROR)return Z.VIDEO},l,u=s(t);if(u===I.MEDIA_ERR_NETWORK&&t.response){let m=(i=o(t))!=null?i:Z.VIDEO;l=(a=Ao(t.response,m,e,t.fatal))!=null?a:new I("",u,t.fatal)}else if(u===I.MEDIA_ERR_ENCRYPTED)if(t.details===K.ErrorDetails.KEY_SYSTEM_NO_CONFIGURED_LICENSE){let m=O("Attempting to play DRM-protected content without providing a DRM token.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,t.fatal),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_MISSING_TOKEN}else if(t.details===K.ErrorDetails.KEY_SYSTEM_NO_ACCESS){let m=O("Cannot play DRM-protected content with current security configuration on this browser. Try playing in another browser.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,t.fatal),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_UNSUPPORTED_KEY_SYSTEM}else if(t.details===K.ErrorDetails.KEY_SYSTEM_NO_SESSION){let m=O("Failed to generate a DRM license request. This may be an issue with the player or your protected content.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,!0),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_GENERATE_REQUEST_FAILED}else if(t.details===K.ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED){let m=O("Failed to update DRM license. This may be an issue with the player or your protected content.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,t.fatal),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_UPDATE_LICENSE_FAILED}else if(t.details===K.ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED){let m=O("Your server certificate failed when attempting to set it. This may be an issue with a no longer valid certificate.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,t.fatal),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_UPDATE_SERVER_CERT_FAILED}else if(t.details===K.ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR){let m=O("The DRM Content Decryption Module system had an internal failure. Try reloading the page, upading your browser, or playing in another browser.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,t.fatal),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_CDM_ERROR}else if(t.details===K.ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED){let m=O("DRM playback is being attempted in an environment that is not sufficiently secure. User may see black screen.");l=new I(m,I.MEDIA_ERR_ENCRYPTED,!1),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_OUTPUT_RESTRICTED}else l=new I(t.error.message,I.MEDIA_ERR_ENCRYPTED,t.fatal),l.errorCategory=Z.DRM,l.muxCode=x.ENCRYPTED_ERROR;else l=new I("",u,t.fatal);return l.context||(l.context=`${t.url?`url: ${t.url}
`:""}${t.response&&(t.response.code||t.response.text)?`response: ${t.response.code}, ${t.response.text}
`:""}${t.reason?`failure reason: ${t.reason}
`:""}${t.level?`level: ${t.level}
`:""}${t.parent?`parent stream controller: ${t.parent}
`:""}${t.buffer?`buffer length: ${t.buffer}
`:""}${t.error?`error: ${t.error}
`:""}${t.event?`event: ${t.event}
`:""}${t.err?`error message: ${(r=t.err)==null?void 0:r.message}
`:""}`),l.data=t,l},yp=t=>{throw TypeError(t)},Tu=(t,e,i)=>e.has(t)||yp("Cannot "+i),_e=(t,e,i)=>(Tu(t,e,"read from private field"),i?i.call(t):e.get(t)),it=(t,e,i)=>e.has(t)?yp("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,i),yt=(t,e,i,a)=>(Tu(t,e,"write to private field"),e.set(t,i),i),Kn=(t,e,i)=>(Tu(t,e,"access private method"),i),Lg=()=>{try{return"0.31.0"}catch{}return"UNKNOWN"},Cg=Lg(),Dg=()=>Cg,Mg=`
<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" part="logo" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 1600 500"><g fill="#fff"><path d="M994.287 93.486c-17.121 0-31-13.879-31-31 0-17.121 13.879-31 31-31 17.121 0 31 13.879 31 31 0 17.121-13.879 31-31 31m0-93.486c-34.509 0-62.484 27.976-62.484 62.486v187.511c0 68.943-56.09 125.033-125.032 125.033s-125.03-56.09-125.03-125.033V62.486C681.741 27.976 653.765 0 619.256 0s-62.484 27.976-62.484 62.486v187.511C556.772 387.85 668.921 500 806.771 500c137.851 0 250.001-112.15 250.001-250.003V62.486c0-34.51-27.976-62.486-62.485-62.486M1537.51 468.511c-17.121 0-31-13.879-31-31 0-17.121 13.879-31 31-31 17.121 0 31 13.879 31 31 0 17.121-13.879 31-31 31m-275.883-218.509-143.33 143.329c-24.402 24.402-24.402 63.966 0 88.368 24.402 24.402 63.967 24.402 88.369 0l143.33-143.329 143.328 143.329c24.402 24.4 63.967 24.402 88.369 0 24.403-24.402 24.403-63.966.001-88.368l-143.33-143.329.001-.004 143.329-143.329c24.402-24.402 24.402-63.965 0-88.367s-63.967-24.402-88.369 0L1349.996 161.63 1206.667 18.302c-24.402-24.401-63.967-24.402-88.369 0s-24.402 63.965 0 88.367l143.329 143.329v.004ZM437.511 468.521c-17.121 0-31-13.879-31-31 0-17.121 13.879-31 31-31 17.121 0 31 13.879 31 31 0 17.121-13.879 31-31 31M461.426 4.759C438.078-4.913 411.2.432 393.33 18.303L249.999 161.632 106.669 18.303C88.798.432 61.922-4.913 38.573 4.759 15.224 14.43-.001 37.214-.001 62.488v375.026c0 34.51 27.977 62.486 62.487 62.486 34.51 0 62.486-27.976 62.486-62.486V213.341l80.843 80.844c24.404 24.402 63.965 24.402 88.369 0l80.843-80.844v224.173c0 34.51 27.976 62.486 62.486 62.486s62.486-27.976 62.486-62.486V62.488c0-25.274-15.224-48.058-38.573-57.729" style="fill-rule:nonzero"/></g></svg>`,f={BEACON_COLLECTION_DOMAIN:"beacon-collection-domain",CUSTOM_DOMAIN:"custom-domain",DEBUG:"debug",DISABLE_TRACKING:"disable-tracking",DISABLE_COOKIES:"disable-cookies",DISABLE_PSEUDO_ENDED:"disable-pseudo-ended",DRM_TOKEN:"drm-token",PLAYBACK_TOKEN:"playback-token",ENV_KEY:"env-key",MAX_RESOLUTION:"max-resolution",MIN_RESOLUTION:"min-resolution",MAX_AUTO_RESOLUTION:"max-auto-resolution",RENDITION_ORDER:"rendition-order",PROGRAM_START_TIME:"program-start-time",PROGRAM_END_TIME:"program-end-time",ASSET_START_TIME:"asset-start-time",ASSET_END_TIME:"asset-end-time",METADATA_URL:"metadata-url",PLAYBACK_ID:"playback-id",PLAYER_SOFTWARE_NAME:"player-software-name",PLAYER_SOFTWARE_VERSION:"player-software-version",PLAYER_INIT_TIME:"player-init-time",PREFER_CMCD:"prefer-cmcd",PREFER_PLAYBACK:"prefer-playback",START_TIME:"start-time",STREAM_TYPE:"stream-type",TARGET_LIVE_WINDOW:"target-live-window",LIVE_EDGE_OFFSET:"live-edge-offset",TYPE:"type",LOGO:"logo",CAP_RENDITION_TO_PLAYER_SIZE:"cap-rendition-to-player-size",INITIAL_BANDWIDTH_ESTIMATE_KBPS:"initial-bandwidth-estimate-kbps",INITIAL_ESTIMATE_SEGMENTS:"initial-estimate-segments",MIN_PRELOAD_SEGMENTS:"min-preload-segments"},Og=Object.values(f),hh=Dg(),mh="mux-video",Hr,us,Br,cs,hs,ms,ps,vs,Wr,fs,nt,Zi,Es,Fr,xg=class extends Wn{constructor(){super(),it(this,nt),it(this,Hr),it(this,us),it(this,Br,{}),it(this,cs,{}),it(this,hs),it(this,ms),it(this,ps),it(this,vs),it(this,Wr,""),it(this,fs,e=>{var i;let a=mg(this.nativeEl),r=(i=this.metadata)!=null?i:{};this.metadata={...a,...r},a?.["com.mux.video.branding"]==="mux-free-plan"&&(yt(this,Wr,"default"),this.updateLogo())}),it(this,Es),yt(this,us,_u())}static get NAME(){return mh}static get VERSION(){return hh}static get observedAttributes(){var e;return[...Og,...(e=Wn.observedAttributes)!=null?e:[]]}static getLogoHTML(e){return!e||e==="false"?"":e==="default"?Mg:`<img part="logo" src="${e}" />`}static getTemplateHTML(e={}){var i;return`
      ${Wn.getTemplateHTML(e)}
      <style>
        :host {
          position: relative;
        }
        slot[name="logo"] {
          display: flex;
          justify-content: end;
          position: absolute;
          top: 1rem;
          right: 1rem;
          opacity: 0;
          transition: opacity 0.25s ease-in-out;
          z-index: 1;
        }
        slot[name="logo"]:has([part="logo"]) {
          opacity: 1;
        }
        slot[name="logo"] [part="logo"] {
          width: 5rem;
          pointer-events: none;
          user-select: none;
        }
      </style>
      <slot name="logo">
        ${this.getLogoHTML((i=e[f.LOGO])!=null?i:"")}
      </slot>
    `}get preferCmcd(){var e;return(e=this.getAttribute(f.PREFER_CMCD))!=null?e:void 0}set preferCmcd(e){e!==this.preferCmcd&&(e?To.includes(e)?this.setAttribute(f.PREFER_CMCD,e):console.warn(`Invalid value for preferCmcd. Must be one of ${To.join()}`):this.removeAttribute(f.PREFER_CMCD))}get playerInitTime(){return this.hasAttribute(f.PLAYER_INIT_TIME)?+this.getAttribute(f.PLAYER_INIT_TIME):_e(this,us)}set playerInitTime(e){e!=this.playerInitTime&&(e==null?this.removeAttribute(f.PLAYER_INIT_TIME):this.setAttribute(f.PLAYER_INIT_TIME,`${+e}`))}get playerSoftwareName(){var e;return(e=_e(this,ps))!=null?e:mh}set playerSoftwareName(e){yt(this,ps,e)}get playerSoftwareVersion(){var e;return(e=_e(this,ms))!=null?e:hh}set playerSoftwareVersion(e){yt(this,ms,e)}get _hls(){var e;return(e=_e(this,nt,Zi))==null?void 0:e.engine}get mux(){var e;return(e=this.nativeEl)==null?void 0:e.mux}get error(){var e;return(e=up(this.nativeEl))!=null?e:null}get errorTranslator(){return _e(this,vs)}set errorTranslator(e){yt(this,vs,e)}get src(){return this.getAttribute("src")}set src(e){e!==this.src&&(e==null?this.removeAttribute("src"):this.setAttribute("src",e))}get type(){var e;return(e=this.getAttribute(f.TYPE))!=null?e:void 0}set type(e){e!==this.type&&(e?this.setAttribute(f.TYPE,e):this.removeAttribute(f.TYPE))}get preload(){let e=this.getAttribute("preload");return e===""?"auto":["none","metadata","auto"].includes(e)?e:super.preload}set preload(e){e!=this.getAttribute("preload")&&(["","none","metadata","auto"].includes(e)?this.setAttribute("preload",e):this.removeAttribute("preload"))}get debug(){return this.getAttribute(f.DEBUG)!=null}set debug(e){e!==this.debug&&(e?this.setAttribute(f.DEBUG,""):this.removeAttribute(f.DEBUG))}get disableTracking(){return this.hasAttribute(f.DISABLE_TRACKING)}set disableTracking(e){e!==this.disableTracking&&this.toggleAttribute(f.DISABLE_TRACKING,!!e)}get disableCookies(){return this.hasAttribute(f.DISABLE_COOKIES)}set disableCookies(e){e!==this.disableCookies&&(e?this.setAttribute(f.DISABLE_COOKIES,""):this.removeAttribute(f.DISABLE_COOKIES))}get disablePseudoEnded(){return this.hasAttribute(f.DISABLE_PSEUDO_ENDED)}set disablePseudoEnded(e){e!==this.disablePseudoEnded&&(e?this.setAttribute(f.DISABLE_PSEUDO_ENDED,""):this.removeAttribute(f.DISABLE_PSEUDO_ENDED))}get startTime(){let e=this.getAttribute(f.START_TIME);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set startTime(e){e!==this.startTime&&(e==null?this.removeAttribute(f.START_TIME):this.setAttribute(f.START_TIME,`${e}`))}get initialBandwidthEstimateKbps(){let e=this.getAttribute(f.INITIAL_BANDWIDTH_ESTIMATE_KBPS);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set initialBandwidthEstimateKbps(e){e!==this.initialBandwidthEstimateKbps&&(e==null?this.removeAttribute(f.INITIAL_BANDWIDTH_ESTIMATE_KBPS):this.setAttribute(f.INITIAL_BANDWIDTH_ESTIMATE_KBPS,`${e}`))}get initialEstimateSegments(){let e=this.getAttribute(f.INITIAL_ESTIMATE_SEGMENTS);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set initialEstimateSegments(e){e!==this.initialEstimateSegments&&(e==null?this.removeAttribute(f.INITIAL_ESTIMATE_SEGMENTS):this.setAttribute(f.INITIAL_ESTIMATE_SEGMENTS,`${e}`))}get minPreloadSegments(){let e=this.getAttribute(f.MIN_PRELOAD_SEGMENTS);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set minPreloadSegments(e){e!==this.minPreloadSegments&&(e==null?this.removeAttribute(f.MIN_PRELOAD_SEGMENTS):this.setAttribute(f.MIN_PRELOAD_SEGMENTS,`${e}`))}get playbackId(){var e;return this.hasAttribute(f.PLAYBACK_ID)?this.getAttribute(f.PLAYBACK_ID):(e=bu(this.src))!=null?e:void 0}set playbackId(e){e!==this.playbackId&&(e?this.setAttribute(f.PLAYBACK_ID,e):this.removeAttribute(f.PLAYBACK_ID))}get maxResolution(){var e;return(e=this.getAttribute(f.MAX_RESOLUTION))!=null?e:void 0}set maxResolution(e){e!==this.maxResolution&&(e?this.setAttribute(f.MAX_RESOLUTION,e):this.removeAttribute(f.MAX_RESOLUTION))}get minResolution(){var e;return(e=this.getAttribute(f.MIN_RESOLUTION))!=null?e:void 0}set minResolution(e){e!==this.minResolution&&(e?this.setAttribute(f.MIN_RESOLUTION,e):this.removeAttribute(f.MIN_RESOLUTION))}get maxAutoResolution(){var e;return(e=this.getAttribute(f.MAX_AUTO_RESOLUTION))!=null?e:void 0}set maxAutoResolution(e){e==null?this.removeAttribute(f.MAX_AUTO_RESOLUTION):this.setAttribute(f.MAX_AUTO_RESOLUTION,e)}get renditionOrder(){var e;return(e=this.getAttribute(f.RENDITION_ORDER))!=null?e:void 0}set renditionOrder(e){e!==this.renditionOrder&&(e?this.setAttribute(f.RENDITION_ORDER,e):this.removeAttribute(f.RENDITION_ORDER))}get programStartTime(){let e=this.getAttribute(f.PROGRAM_START_TIME);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set programStartTime(e){e==null?this.removeAttribute(f.PROGRAM_START_TIME):this.setAttribute(f.PROGRAM_START_TIME,`${e}`)}get programEndTime(){let e=this.getAttribute(f.PROGRAM_END_TIME);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set programEndTime(e){e==null?this.removeAttribute(f.PROGRAM_END_TIME):this.setAttribute(f.PROGRAM_END_TIME,`${e}`)}get assetStartTime(){let e=this.getAttribute(f.ASSET_START_TIME);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set assetStartTime(e){e==null?this.removeAttribute(f.ASSET_START_TIME):this.setAttribute(f.ASSET_START_TIME,`${e}`)}get assetEndTime(){let e=this.getAttribute(f.ASSET_END_TIME);if(e==null)return;let i=+e;return Number.isNaN(i)?void 0:i}set assetEndTime(e){e==null?this.removeAttribute(f.ASSET_END_TIME):this.setAttribute(f.ASSET_END_TIME,`${e}`)}get customDomain(){var e;return(e=this.getAttribute(f.CUSTOM_DOMAIN))!=null?e:void 0}set customDomain(e){e!==this.customDomain&&(e?this.setAttribute(f.CUSTOM_DOMAIN,e):this.removeAttribute(f.CUSTOM_DOMAIN))}get capRenditionToPlayerSize(){var e;return((e=this._hlsConfig)==null?void 0:e.capLevelToPlayerSize)!=null?this._hlsConfig.capLevelToPlayerSize:_e(this,Es)}set capRenditionToPlayerSize(e){yt(this,Es,e)}get drmToken(){var e;return(e=this.getAttribute(f.DRM_TOKEN))!=null?e:void 0}set drmToken(e){e!==this.drmToken&&(e?this.setAttribute(f.DRM_TOKEN,e):this.removeAttribute(f.DRM_TOKEN))}get playbackToken(){var e,i,a,r;if(this.hasAttribute(f.PLAYBACK_TOKEN))return(e=this.getAttribute(f.PLAYBACK_TOKEN))!=null?e:void 0;if(this.hasAttribute(f.PLAYBACK_ID)){let[,n]=hu((i=this.playbackId)!=null?i:"");return(a=new URLSearchParams(n).get("token"))!=null?a:void 0}if(this.src)return(r=new URLSearchParams(this.src).get("token"))!=null?r:void 0}set playbackToken(e){e!==this.playbackToken&&(e?this.setAttribute(f.PLAYBACK_TOKEN,e):this.removeAttribute(f.PLAYBACK_TOKEN))}get tokens(){let e=this.getAttribute(f.PLAYBACK_TOKEN),i=this.getAttribute(f.DRM_TOKEN);return{..._e(this,cs),...e!=null?{playback:e}:{},...i!=null?{drm:i}:{}}}set tokens(e){yt(this,cs,e??{})}get ended(){return mp(this.nativeEl,this._hls)}get envKey(){var e;return(e=this.getAttribute(f.ENV_KEY))!=null?e:void 0}set envKey(e){e!==this.envKey&&(e?this.setAttribute(f.ENV_KEY,e):this.removeAttribute(f.ENV_KEY))}get beaconCollectionDomain(){var e;return(e=this.getAttribute(f.BEACON_COLLECTION_DOMAIN))!=null?e:void 0}set beaconCollectionDomain(e){e!==this.beaconCollectionDomain&&(e?this.setAttribute(f.BEACON_COLLECTION_DOMAIN,e):this.removeAttribute(f.BEACON_COLLECTION_DOMAIN))}get streamType(){var e;return(e=this.getAttribute(f.STREAM_TYPE))!=null?e:ed(this.nativeEl)}set streamType(e){e!==this.streamType&&(e?this.setAttribute(f.STREAM_TYPE,e):this.removeAttribute(f.STREAM_TYPE))}get targetLiveWindow(){return this.hasAttribute(f.TARGET_LIVE_WINDOW)?+this.getAttribute(f.TARGET_LIVE_WINDOW):pg(this.nativeEl)}set targetLiveWindow(e){e!=this.targetLiveWindow&&(e==null?this.removeAttribute(f.TARGET_LIVE_WINDOW):this.setAttribute(f.TARGET_LIVE_WINDOW,`${+e}`))}get liveEdgeStart(){var e,i;if(this.hasAttribute(f.LIVE_EDGE_OFFSET)){let{liveEdgeOffset:a}=this,r=(e=this.nativeEl.seekable.end(0))!=null?e:0,n=(i=this.nativeEl.seekable.start(0))!=null?i:0;return Math.max(n,r-a)}return vg(this.nativeEl)}get liveEdgeOffset(){if(this.hasAttribute(f.LIVE_EDGE_OFFSET))return+this.getAttribute(f.LIVE_EDGE_OFFSET)}set liveEdgeOffset(e){e!=this.liveEdgeOffset&&(e==null?this.removeAttribute(f.LIVE_EDGE_OFFSET):this.setAttribute(f.LIVE_EDGE_OFFSET,`${+e}`))}get seekable(){return gu(this.nativeEl)}async addCuePoints(e){return ap(this.nativeEl,e)}get activeCuePoint(){return rp(this.nativeEl)}get cuePoints(){return Ob(this.nativeEl)}async addChapters(e){return sp(this.nativeEl,e)}get activeChapter(){return op(this.nativeEl)}get chapters(){return Nb(this.nativeEl)}getStartDate(){return $b(this.nativeEl,this._hls)}get currentPdt(){return Ub(this.nativeEl,this._hls)}get preferPlayback(){let e=this.getAttribute(f.PREFER_PLAYBACK);if(e===Gt.MSE||e===Gt.NATIVE)return e}set preferPlayback(e){e!==this.preferPlayback&&(e===Gt.MSE||e===Gt.NATIVE?this.setAttribute(f.PREFER_PLAYBACK,e):this.removeAttribute(f.PREFER_PLAYBACK))}get metadata(){return{...this.getAttributeNames().filter(e=>e.startsWith("metadata-")&&![f.METADATA_URL].includes(e)).reduce((e,i)=>{let a=this.getAttribute(i);return a!=null&&(e[i.replace(/^metadata-/,"").replace(/-/g,"_")]=a),e},{}),..._e(this,Br)}}set metadata(e){yt(this,Br,e??{}),this.mux&&this.mux.emit("hb",_e(this,Br))}get _hlsConfig(){return _e(this,hs)}set _hlsConfig(e){yt(this,hs,e)}get logo(){var e;return(e=this.getAttribute(f.LOGO))!=null?e:_e(this,Wr)}set logo(e){e?this.setAttribute(f.LOGO,e):this.removeAttribute(f.LOGO)}load(){pp(this,this.nativeEl,_e(this,nt,Zi))}unload(){vp(this.nativeEl,_e(this,nt,Zi),this)}attributeChangedCallback(e,i,a){var r,n;switch(Wn.observedAttributes.includes(e)&&!["src","autoplay","preload"].includes(e)&&super.attributeChangedCallback(e,i,a),e){case f.PLAYER_SOFTWARE_NAME:this.playerSoftwareName=a??void 0;break;case f.PLAYER_SOFTWARE_VERSION:this.playerSoftwareVersion=a??void 0;break;case"src":{let s=!!i,o=!!a;!s&&o?Kn(this,nt,Fr).call(this):s&&!o?this.unload():s&&o&&(this.unload(),Kn(this,nt,Fr).call(this));break}case"autoplay":if(a===i)break;(r=_e(this,nt,Zi))==null||r.setAutoplay(this.autoplay);break;case"preload":if(a===i)break;(n=_e(this,nt,Zi))==null||n.setPreload(a);break;case f.PLAYBACK_ID:case f.CUSTOM_DOMAIN:case f.MAX_RESOLUTION:case f.MIN_RESOLUTION:case f.RENDITION_ORDER:case f.PROGRAM_START_TIME:case f.PROGRAM_END_TIME:case f.ASSET_START_TIME:case f.ASSET_END_TIME:case f.PLAYBACK_TOKEN:this.src=Jl(this);break;case f.DEBUG:{let s=this.debug;this.mux&&console.info("Cannot toggle debug mode of mux data after initialization. Make sure you set all metadata to override before setting the src."),this._hls&&(this._hls.config.debug=s);break}case f.METADATA_URL:a&&fetch(a).then(s=>s.json()).then(s=>this.metadata=s).catch(()=>console.error(`Unable to load or parse metadata JSON from metadata-url ${a}!`));break;case f.STREAM_TYPE:(a==null||a!==i)&&this.dispatchEvent(new CustomEvent("streamtypechange",{composed:!0,bubbles:!0}));break;case f.TARGET_LIVE_WINDOW:(a==null||a!==i)&&this.dispatchEvent(new CustomEvent("targetlivewindowchange",{composed:!0,bubbles:!0,detail:this.targetLiveWindow}));break;case f.LOGO:(a==null||a!==i)&&this.updateLogo();break;case f.DISABLE_TRACKING:{if(a==null||a!==i){let s=this.currentTime,o=this.paused;this.unload(),Kn(this,nt,Fr).call(this).then(()=>{this.currentTime=s,o||this.play()})}break}case f.DISABLE_COOKIES:{(a==null||a!==i)&&this.disableCookies&&document.cookie.split(";").forEach(s=>{s.trim().startsWith("muxData")&&(document.cookie=s.replace(/^ +/,"").replace(/=.*/,"=;expires="+new Date().toUTCString()+";path=/"))});break}case f.CAP_RENDITION_TO_PLAYER_SIZE:(a==null||a!==i)&&(this.capRenditionToPlayerSize=a!=null?!0:void 0)}}updateLogo(){if(!this.shadowRoot)return;let e=this.shadowRoot.querySelector('slot[name="logo"]');if(!e)return;let i=this.constructor.getLogoHTML(_e(this,Wr)||this.logo);e.innerHTML=i}connectedCallback(){var e,i;(e=super.connectedCallback)==null||e.call(this),(i=this.nativeEl)==null||i.addEventListener("muxmetadata",_e(this,fs)),this.nativeEl&&this.src&&!_e(this,nt,Zi)&&Kn(this,nt,Fr).call(this)}disconnectedCallback(){var e,i;(e=this.nativeEl)==null||e.removeEventListener("muxmetadata",_e(this,fs)),this.unload(),(i=super.disconnectedCallback)==null||i.call(this)}handleEvent(e){e.target===this.nativeEl&&this.dispatchEvent(new CustomEvent(e.type,{composed:!0,detail:e.detail}))}};Hr=new WeakMap,us=new WeakMap,Br=new WeakMap,cs=new WeakMap,hs=new WeakMap,ms=new WeakMap,ps=new WeakMap,vs=new WeakMap,Wr=new WeakMap,fs=new WeakMap,nt=new WeakSet,Zi=function(){return fg(this.nativeEl)},Es=new WeakMap,Fr=async function(){_e(this,Hr)||(await yt(this,Hr,Promise.resolve()),yt(this,Hr,null),this.load())};const Hi=new WeakMap;class Rl extends Error{}class Ng extends Error{}const Pg=["application/x-mpegURL","application/vnd.apple.mpegurl","audio/mpegurl"],$g=globalThis.WeakRef?class extends Set{add(t){super.add(new WeakRef(t))}forEach(t){super.forEach(e=>{const i=e.deref();i&&t(i)})}}:Set;function Ug(t){globalThis.chrome?.cast?.isAvailable?globalThis.cast?.framework?t():customElements.whenDefined("google-cast-button").then(t):globalThis.__onGCastApiAvailable=()=>{customElements.whenDefined("google-cast-button").then(t)}}function Hg(){return globalThis.chrome}function Bg(){const t="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";if(globalThis.chrome?.cast||document.querySelector(`script[src="${t}"]`))return;const e=document.createElement("script");e.src=t,document.head.append(e)}function Pi(){return globalThis.cast?.framework?.CastContext.getInstance()}function Au(){return Pi()?.getCurrentSession()}function ku(){return Au()?.getSessionObj().media[0]}function Wg(t){return new Promise((e,i)=>{ku().editTracksInfo(t,e,i)})}function Fg(t){return new Promise((e,i)=>{ku().getStatus(t,e,i)})}function ph(t){return Pi().setOptions({...Tp(),...t})}function Tp(){return{receiverApplicationId:"CC1AD845",autoJoinPolicy:"origin_scoped",androidReceiverCompatible:!1,language:"en-US",resumeSavedSession:!0}}function vh(t){if(!t)return;const e=/\.([a-zA-Z0-9]+)(?:\?.*)?$/,i=t.match(e);return i?i[1]:null}function Kg(t){for(const e of t.split(`
`)){const i=e.trim();if(i.startsWith("#EXT-X-MEDIA")&&/TYPE=AUDIO/i.test(i)){const a=i.match(/URI="([^"]+)"/i);if(a)return a[1]}}}function Vg(t){const e=t.split(`
`),i=[];for(let a=0;a<e.length;a++)if(e[a].trim().startsWith("#EXT-X-STREAM-INF")){const n=e[a+1]?e[a+1].trim():"";n&&!n.startsWith("#")&&i.push(n)}return i}function fh(t){return t.split(`
`).find(a=>!a.trim().startsWith("#")&&a.trim()!=="")?.trim()}async function qg(t){if(!t)return!1;if(/\.m3u8?(\?.*)?$/i.test(t))return!0;if(t.startsWith("blob:"))return!1;try{const i=(await fetch(t,{method:"HEAD"})).headers.get("Content-Type");return Pg.some(a=>i===a)}catch(e){return console.error("Error while trying to get the Content-Type of the manifest",e),!1}}async function Yg(t){if(!t||t.startsWith("blob:"))return{videoFormat:void 0,audioFormat:void 0};try{const e=await(await fetch(t)).text();let i=e;const a=Vg(e);if(a.length>0){const l=new URL(a[0],t).toString();i=await(await fetch(l)).text()}const r=fh(i),n=vh(r),s=Kg(e);let o=n;if(s)try{const l=new URL(s,t).toString(),u=await(await fetch(l)).text(),m=fh(u);o=vh(m)??n}catch(l){console.error("Error while trying to parse the audio rendition playlist",l)}return{videoFormat:n,audioFormat:o}}catch(e){return console.error("Error while trying to parse the manifest playlist",e),{videoFormat:void 0,audioFormat:void 0}}}const _s=new $g,ti=new WeakSet;let Ae;Ug(()=>{if(!globalThis.chrome?.cast?.isAvailable){console.debug("chrome.cast.isAvailable",globalThis.chrome?.cast?.isAvailable);return}Ae||(Ae=cast.framework,Pi().addEventListener(Ae.CastContextEventType.CAST_STATE_CHANGED,t=>{_s.forEach(e=>Hi.get(e).onCastStateChanged?.(t))}),Pi().addEventListener(Ae.CastContextEventType.SESSION_STATE_CHANGED,t=>{_s.forEach(e=>Hi.get(e).onSessionStateChanged?.(t))}),_s.forEach(t=>Hi.get(t).init?.()))});let Eh=0;class Gg extends EventTarget{#t;#r;#i;#a;#e="disconnected";#n=!1;#o=new Set;#h=new WeakMap;#l=()=>this.#c();constructor(e){super(),this.#t=e,_s.add(this),Hi.set(this,{init:()=>this.#u(),onCastStateChanged:()=>this.#d(),onSessionStateChanged:()=>this.#v(),getCastPlayer:()=>this.#s}),this.#u()}destroy(){this.#t?.textTracks?.removeEventListener("change",this.#l),this.#a&&this.#i?.controller&&Object.entries(this.#a).forEach(([e,i])=>{this.#i.controller.removeEventListener(e,i)}),this.#t&&ti.delete(this.#t),this.#r=!1}get#s(){if(ti.has(this.#t))return this.#i}get state(){return this.#e}async watchAvailability(e){if(this.#t.disableRemotePlayback)throw new Rl("disableRemotePlayback attribute is present.");return this.#h.set(e,++Eh),this.#o.add(e),queueMicrotask(()=>e(this.#p())),Eh}async cancelWatchAvailability(e){if(this.#t.disableRemotePlayback)throw new Rl("disableRemotePlayback attribute is present.");e?this.#o.delete(e):this.#o.clear()}async prompt(){if(this.#t.disableRemotePlayback)throw new Rl("disableRemotePlayback attribute is present.");if(!globalThis.chrome?.cast?.isAvailable)throw new Ng("The RemotePlayback API is disabled on this platform.");const e=ti.has(this.#t);ti.add(this.#t),ph(this.#t.castOptions),Object.entries(this.#a).forEach(([i,a])=>{this.#i.controller.addEventListener(i,a)});try{await Pi().requestSession()}catch(i){if(e||ti.delete(this.#t),i==="cancel")return;throw new Error(i)}Hi.get(this.#t)?.loadOnPrompt?.()}#m(){ti.has(this.#t)&&(Object.entries(this.#a).forEach(([e,i])=>{this.#i.controller.removeEventListener(e,i)}),ti.delete(this.#t),this.#t.muted=this.#i.isMuted,this.#t.currentTime=this.#i.savedPlayerState.currentTime,this.#i.savedPlayerState.isPaused===!1&&this.#t.play())}#p(){const e=Pi()?.getCastState();return e&&e!=="NO_DEVICES_AVAILABLE"}#d(){const e=Pi().getCastState();if(ti.has(this.#t)&&e==="CONNECTING"&&(this.#e="connecting",this.dispatchEvent(new Event("connecting"))),!this.#n&&e?.includes("CONNECT")){this.#n=!0;for(let i of this.#o)i(!0)}else if(this.#n&&(!e||e==="NO_DEVICES_AVAILABLE")){this.#n=!1;for(let i of this.#o)i(!1)}}async#v(){const{SESSION_RESUMED:e}=Ae.SessionState;if(Pi().getSessionState()===e&&this.#t.castSrc===ku()?.media.contentId){ti.add(this.#t),Object.entries(this.#a).forEach(([i,a])=>{this.#i.controller.addEventListener(i,a)});try{await Fg(new chrome.cast.media.GetStatusRequest)}catch(i){console.error(i)}this.#a[Ae.RemotePlayerEventType.IS_PAUSED_CHANGED](),this.#a[Ae.RemotePlayerEventType.PLAYER_STATE_CHANGED]()}}#u(){!Ae||this.#r||(this.#r=!0,ph(this.#t.castOptions),this.#t.textTracks.addEventListener("change",this.#l),this.#d(),this.#i=new Ae.RemotePlayer,new Ae.RemotePlayerController(this.#i),this.#a={[Ae.RemotePlayerEventType.IS_CONNECTED_CHANGED]:({value:e})=>{e===!0?(this.#e="connected",this.dispatchEvent(new Event("connect"))):(this.#m(),this.#e="disconnected",this.dispatchEvent(new Event("disconnect")))},[Ae.RemotePlayerEventType.DURATION_CHANGED]:()=>{this.#t.dispatchEvent(new Event("durationchange"))},[Ae.RemotePlayerEventType.VOLUME_LEVEL_CHANGED]:()=>{this.#t.dispatchEvent(new Event("volumechange"))},[Ae.RemotePlayerEventType.IS_MUTED_CHANGED]:()=>{this.#t.dispatchEvent(new Event("volumechange"))},[Ae.RemotePlayerEventType.CURRENT_TIME_CHANGED]:()=>{this.#s?.isMediaLoaded&&this.#t.dispatchEvent(new Event("timeupdate"))},[Ae.RemotePlayerEventType.VIDEO_INFO_CHANGED]:()=>{this.#t.dispatchEvent(new Event("resize"))},[Ae.RemotePlayerEventType.IS_PAUSED_CHANGED]:()=>{this.#t.dispatchEvent(new Event(this.paused?"pause":"play"))},[Ae.RemotePlayerEventType.PLAYER_STATE_CHANGED]:()=>{this.#s?.playerState!==chrome.cast.media.PlayerState.PAUSED&&this.#t.dispatchEvent(new Event({[chrome.cast.media.PlayerState.PLAYING]:"playing",[chrome.cast.media.PlayerState.BUFFERING]:"waiting",[chrome.cast.media.PlayerState.IDLE]:"emptied"}[this.#s?.playerState]))},[Ae.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED]:async()=>{this.#s?.isMediaLoaded&&(await Promise.resolve(),this.#f())}})}#f(){this.#c()}async#c(){if(!this.#s)return;const i=(this.#i.mediaInfo?.tracks??[]).filter(({type:p})=>p===chrome.cast.media.TrackType.TEXT),a=[...this.#t.textTracks].filter(({kind:p})=>p==="subtitles"||p==="captions"),r=i.map(({language:p,name:h,trackId:d})=>{const{mode:v}=a.find(E=>E.language===p&&E.label===h)??{};return v?{mode:v,trackId:d}:!1}).filter(Boolean),s=r.filter(({mode:p})=>p!=="showing").map(({trackId:p})=>p),o=r.find(({mode:p})=>p==="showing"),l=Au()?.getSessionObj().media[0]?.activeTrackIds??[];let u=l;if(l.length&&(u=u.filter(p=>!s.includes(p))),o?.trackId&&(u=[...u,o.trackId]),u=[...new Set(u)],!((p,h)=>p.length===h.length&&p.every(d=>h.includes(d)))(l,u))try{const p=new chrome.cast.media.EditTracksInfoRequest(u);await Wg(p)}catch(p){console.error(p)}}}const zg=t=>class extends t{static observedAttributes=[...t.observedAttributes??[],"cast-src","cast-content-type","cast-stream-type","cast-receiver"];#t={paused:!1};#r=Tp();#i;#a;get remote(){return this.#a?this.#a:Hg()?this.isConnected?(this.disableRemotePlayback||Bg(),Hi.set(this,{loadOnPrompt:()=>this.#n()}),this.#a=new Gg(this)):void 0:super.remote}get#e(){return Hi.get(this.#a)?.getCastPlayer?.()}disconnectedCallback(){this.#a?.destroy(),this.#a=null,Hi.delete(this),super.disconnectedCallback?.()}attributeChangedCallback(i,a,r){if(super.attributeChangedCallback(i,a,r),i==="cast-receiver"&&r){this.#r.receiverApplicationId=r;return}if(this.#e)switch(i){case"cast-stream-type":case"cast-src":this.load();break}}async#n(){this.#t.paused=super.paused,super.pause(),this.muted=super.muted;try{await this.load()}catch(i){console.error(i)}}async load(){if(!this.#e)return super.load();const i=new chrome.cast.media.MediaInfo(this.castSrc,this.castContentType);i.customData=this.castCustomData;const a=[...this.querySelectorAll("track")].filter(({kind:l,src:u})=>u&&(l==="subtitles"||l==="captions")),r=[];let n=0;if(a.length&&(i.tracks=a.map(l=>{const u=++n;r.length===0&&l.track.mode==="showing"&&r.push(u);const m=new chrome.cast.media.Track(u,chrome.cast.media.TrackType.TEXT);return m.trackContentId=l.src,m.trackContentType="text/vtt",m.subtype=l.kind==="captions"?chrome.cast.media.TextTrackType.CAPTIONS:chrome.cast.media.TextTrackType.SUBTITLES,m.name=l.label,m.language=l.srclang,m})),this.castStreamType==="live"?i.streamType=chrome.cast.media.StreamType.LIVE:i.streamType=chrome.cast.media.StreamType.BUFFERED,i.metadata=new chrome.cast.media.GenericMediaMetadata,i.metadata.title=this.title,i.metadata.images=[{url:this.poster}],await qg(this.castSrc)){i.contentType||(i.contentType="application/x-mpegURL");const{videoFormat:l,audioFormat:u}=await Yg(this.castSrc);l?.includes("m4s")||l?.includes("mp4")||l?.includes("m4a")?(i.hlsSegmentFormat=chrome.cast.media.HlsSegmentFormat.FMP4,i.hlsVideoSegmentFormat=chrome.cast.media.HlsVideoSegmentFormat.FMP4):u?.includes("aac")?(i.hlsSegmentFormat=chrome.cast.media.HlsSegmentFormat.AAC,i.hlsVideoSegmentFormat=chrome.cast.media.HlsVideoSegmentFormat.MPEG2_TS):(l?.includes("ts")||u?.includes("ts"))&&(i.hlsSegmentFormat=chrome.cast.media.HlsSegmentFormat.TS,i.hlsVideoSegmentFormat=chrome.cast.media.HlsVideoSegmentFormat.MPEG2_TS)}const o=new chrome.cast.media.LoadRequest(i);o.currentTime=super.currentTime??0,o.autoplay=!this.#t.paused,o.activeTrackIds=r,await Au()?.loadMedia(o),this.dispatchEvent(new Event("volumechange"))}play(){if(this.#e){this.#e.isPaused&&this.#e.controller?.playOrPause();return}return super.play()}pause(){if(this.#e){this.#e.isPaused||this.#e.controller?.playOrPause();return}super.pause()}get castOptions(){return this.#r}get castReceiver(){return this.getAttribute("cast-receiver")??void 0}set castReceiver(i){this.castReceiver!=i&&this.setAttribute("cast-receiver",`${i}`)}get castSrc(){const i=this.currentSrc,a=i?.startsWith("blob:")?void 0:i;return this.getAttribute("cast-src")??this.querySelector("source")?.src??a??this.getAttribute("src")??void 0}set castSrc(i){this.castSrc!=i&&this.setAttribute("cast-src",`${i}`)}get castContentType(){return this.getAttribute("cast-content-type")??void 0}set castContentType(i){this.setAttribute("cast-content-type",`${i}`)}get castStreamType(){return this.getAttribute("cast-stream-type")??this.streamType??void 0}set castStreamType(i){this.setAttribute("cast-stream-type",`${i}`)}get castCustomData(){return this.#i}set castCustomData(i){const a=typeof i;if(!["object","undefined"].includes(a)){console.error(`castCustomData must be nullish or an object but value was of type ${a}`);return}this.#i=i}get readyState(){if(this.#e)switch(this.#e.playerState){case chrome.cast.media.PlayerState.IDLE:return 0;case chrome.cast.media.PlayerState.BUFFERING:return 2;default:return 3}return super.readyState}get paused(){return this.#e?this.#e.isPaused:super.paused}get muted(){return this.#e?this.#e?.isMuted:super.muted}set muted(i){if(this.#e){(i&&!this.#e.isMuted||!i&&this.#e.isMuted)&&this.#e.controller?.muteOrUnmute();return}super.muted=i}get volume(){return this.#e?this.#e?.volumeLevel??1:super.volume}set volume(i){if(this.#e){this.#e.volumeLevel=+i,this.#e.controller?.setVolumeLevel();return}super.volume=i}get duration(){return this.#e&&this.#e?.isMediaLoaded?this.#e?.duration??NaN:super.duration}get currentTime(){return this.#e&&this.#e?.isMediaLoaded?this.#e?.currentTime??0:super.currentTime}set currentTime(i){if(this.#e){this.#e.currentTime=i,this.#e.controller?.seek();return}super.currentTime=i}};var Ap=t=>{throw TypeError(t)},kp=(t,e,i)=>e.has(t)||Ap("Cannot "+i),Qg=(t,e,i)=>(kp(t,e,"read from private field"),i?i.call(t):e.get(t)),jg=(t,e,i)=>e.has(t)?Ap("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,i),Zg=(t,e,i,a)=>(kp(t,e,"write to private field"),e.set(t,i),i),Sp=class{addEventListener(){}removeEventListener(){}dispatchEvent(e){return!0}};if(typeof DocumentFragment>"u"){class t extends Sp{}globalThis.DocumentFragment=t}var Xg=class extends Sp{},Jg={get(t){},define(t,e,i){},getName(t){return null},upgrade(t){},whenDefined(t){return Promise.resolve(Xg)}},e0={customElements:Jg},t0=typeof window>"u"||typeof globalThis.customElements>"u",Ll=t0?e0:globalThis,bs,_h=class extends zg(Ff(xg)){constructor(){super(...arguments),jg(this,bs)}get autoplay(){let t=this.getAttribute("autoplay");return t===null?!1:t===""?!0:t}set autoplay(t){let e=this.autoplay;t!==e&&(t?this.setAttribute("autoplay",typeof t=="string"?t:""):this.removeAttribute("autoplay"))}get muxCastCustomData(){return{mux:{playbackId:this.playbackId,minResolution:this.minResolution,maxResolution:this.maxResolution,renditionOrder:this.renditionOrder,customDomain:this.customDomain,tokens:{drm:this.drmToken},envKey:this.envKey,metadata:this.metadata,disableCookies:this.disableCookies,disableTracking:this.disableTracking,beaconCollectionDomain:this.beaconCollectionDomain,startTime:this.startTime,preferCmcd:this.preferCmcd}}}get castCustomData(){var t;return(t=Qg(this,bs))!=null?t:this.muxCastCustomData}set castCustomData(t){Zg(this,bs,t)}};bs=new WeakMap;Ll.customElements.get("mux-video")||(Ll.customElements.define("mux-video",_h),Ll.MuxVideoElement=_h);const L={MEDIA_PLAY_REQUEST:"mediaplayrequest",MEDIA_PAUSE_REQUEST:"mediapauserequest",MEDIA_MUTE_REQUEST:"mediamuterequest",MEDIA_UNMUTE_REQUEST:"mediaunmuterequest",MEDIA_LOOP_REQUEST:"medialooprequest",MEDIA_VOLUME_REQUEST:"mediavolumerequest",MEDIA_SEEK_REQUEST:"mediaseekrequest",MEDIA_AIRPLAY_REQUEST:"mediaairplayrequest",MEDIA_ENTER_FULLSCREEN_REQUEST:"mediaenterfullscreenrequest",MEDIA_EXIT_FULLSCREEN_REQUEST:"mediaexitfullscreenrequest",MEDIA_PREVIEW_REQUEST:"mediapreviewrequest",MEDIA_ENTER_PIP_REQUEST:"mediaenterpiprequest",MEDIA_EXIT_PIP_REQUEST:"mediaexitpiprequest",MEDIA_ENTER_CAST_REQUEST:"mediaentercastrequest",MEDIA_EXIT_CAST_REQUEST:"mediaexitcastrequest",MEDIA_SHOW_TEXT_TRACKS_REQUEST:"mediashowtexttracksrequest",MEDIA_HIDE_TEXT_TRACKS_REQUEST:"mediahidetexttracksrequest",MEDIA_SHOW_SUBTITLES_REQUEST:"mediashowsubtitlesrequest",MEDIA_DISABLE_SUBTITLES_REQUEST:"mediadisablesubtitlesrequest",MEDIA_TOGGLE_SUBTITLES_REQUEST:"mediatogglesubtitlesrequest",MEDIA_PLAYBACK_RATE_REQUEST:"mediaplaybackraterequest",MEDIA_RENDITION_REQUEST:"mediarenditionrequest",MEDIA_AUDIO_TRACK_REQUEST:"mediaaudiotrackrequest",MEDIA_SEEK_TO_LIVE_REQUEST:"mediaseektoliverequest",REGISTER_MEDIA_STATE_RECEIVER:"registermediastatereceiver",UNREGISTER_MEDIA_STATE_RECEIVER:"unregistermediastatereceiver"},Q={MEDIA_CHROME_ATTRIBUTES:"mediachromeattributes",MEDIA_CONTROLLER:"mediacontroller"},wp={MEDIA_AIRPLAY_UNAVAILABLE:"mediaAirplayUnavailable",MEDIA_AUDIO_TRACK_ENABLED:"mediaAudioTrackEnabled",MEDIA_AUDIO_TRACK_LIST:"mediaAudioTrackList",MEDIA_AUDIO_TRACK_UNAVAILABLE:"mediaAudioTrackUnavailable",MEDIA_BUFFERED:"mediaBuffered",MEDIA_CAST_UNAVAILABLE:"mediaCastUnavailable",MEDIA_CHAPTERS_CUES:"mediaChaptersCues",MEDIA_CURRENT_TIME:"mediaCurrentTime",MEDIA_DURATION:"mediaDuration",MEDIA_ENDED:"mediaEnded",MEDIA_ERROR:"mediaError",MEDIA_ERROR_CODE:"mediaErrorCode",MEDIA_ERROR_MESSAGE:"mediaErrorMessage",MEDIA_FULLSCREEN_UNAVAILABLE:"mediaFullscreenUnavailable",MEDIA_HAS_PLAYED:"mediaHasPlayed",MEDIA_HEIGHT:"mediaHeight",MEDIA_IS_AIRPLAYING:"mediaIsAirplaying",MEDIA_IS_CASTING:"mediaIsCasting",MEDIA_IS_FULLSCREEN:"mediaIsFullscreen",MEDIA_IS_PIP:"mediaIsPip",MEDIA_LOADING:"mediaLoading",MEDIA_MUTED:"mediaMuted",MEDIA_LOOP:"mediaLoop",MEDIA_PAUSED:"mediaPaused",MEDIA_PIP_UNAVAILABLE:"mediaPipUnavailable",MEDIA_PLAYBACK_RATE:"mediaPlaybackRate",MEDIA_PREVIEW_CHAPTER:"mediaPreviewChapter",MEDIA_PREVIEW_COORDS:"mediaPreviewCoords",MEDIA_PREVIEW_IMAGE:"mediaPreviewImage",MEDIA_PREVIEW_TIME:"mediaPreviewTime",MEDIA_RENDITION_LIST:"mediaRenditionList",MEDIA_RENDITION_SELECTED:"mediaRenditionSelected",MEDIA_RENDITION_UNAVAILABLE:"mediaRenditionUnavailable",MEDIA_SEEKABLE:"mediaSeekable",MEDIA_STREAM_TYPE:"mediaStreamType",MEDIA_SUBTITLES_LIST:"mediaSubtitlesList",MEDIA_SUBTITLES_SHOWING:"mediaSubtitlesShowing",MEDIA_TARGET_LIVE_WINDOW:"mediaTargetLiveWindow",MEDIA_TIME_IS_LIVE:"mediaTimeIsLive",MEDIA_VOLUME:"mediaVolume",MEDIA_VOLUME_LEVEL:"mediaVolumeLevel",MEDIA_VOLUME_UNAVAILABLE:"mediaVolumeUnavailable",MEDIA_LANG:"mediaLang",MEDIA_WIDTH:"mediaWidth"},Ip=Object.entries(wp),c=Ip.reduce((t,[e,i])=>(t[e]=i.toLowerCase(),t),{}),i0={USER_INACTIVE_CHANGE:"userinactivechange",BREAKPOINTS_CHANGE:"breakpointchange",BREAKPOINTS_COMPUTED:"breakpointscomputed"},Xt=Ip.reduce((t,[e,i])=>(t[e]=i.toLowerCase(),t),{...i0});Object.entries(Xt).reduce((t,[e,i])=>{const a=c[e];return a&&(t[i]=a),t},{userinactivechange:"userinactive"});const a0=Object.entries(c).reduce((t,[e,i])=>{const a=Xt[e];return a&&(t[i]=a),t},{userinactive:"userinactivechange"}),jt={SUBTITLES:"subtitles",CAPTIONS:"captions",CHAPTERS:"chapters",METADATA:"metadata"},ir={DISABLED:"disabled",SHOWING:"showing"},Cl={MOUSE:"mouse",PEN:"pen",TOUCH:"touch"},Xe={UNAVAILABLE:"unavailable",UNSUPPORTED:"unsupported"},di={LIVE:"live",ON_DEMAND:"on-demand",UNKNOWN:"unknown"},r0={FULLSCREEN:"fullscreen"};function n0(t){return t?.map(o0).join(" ")}function s0(t){return t?.split(/\s+/).map(l0)}function o0(t){if(t){const{id:e,width:i,height:a}=t;return[e,i,a].filter(r=>r!=null).join(":")}}function l0(t){if(t){const[e,i,a]=t.split(":");return{id:e,width:+i,height:+a}}}function d0(t){return t?.map(c0).join(" ")}function u0(t){return t?.split(/\s+/).map(h0)}function c0(t){if(t){const{id:e,kind:i,language:a,label:r}=t;return[e,i,a,r].filter(n=>n!=null).join(":")}}function h0(t){if(t){const[e,i,a,r]=t.split(":");return{id:e,kind:i,language:a,label:r}}}function m0(t){return t.replace(/[-_]([a-z])/g,(e,i)=>i.toUpperCase())}function Su(t){return typeof t=="number"&&!Number.isNaN(t)&&Number.isFinite(t)}function Rp(t){return typeof t!="string"?!1:!isNaN(t)&&!isNaN(parseFloat(t))}const Lp=t=>new Promise(e=>setTimeout(e,t)),p0={"Start airplay":"Start airplay","Stop airplay":"Stop airplay",Audio:"Audio",Captions:"Captions","Enable captions":"Enable captions","Disable captions":"Disable captions","Start casting":"Start casting","Stop casting":"Stop casting","Enter fullscreen mode":"Enter fullscreen mode","Exit fullscreen mode":"Exit fullscreen mode",Mute:"Mute",Unmute:"Unmute",Loop:"Loop","Enter picture in picture mode":"Enter picture in picture mode","Exit picture in picture mode":"Exit picture in picture mode",Play:"Play",Pause:"Pause","Playback rate":"Playback rate","Playback rate {playbackRate}":"Playback rate {playbackRate}",Quality:"Quality","Seek backward":"Seek backward","Seek forward":"Seek forward",Settings:"Settings",Auto:"Auto","audio player":"audio player","video player":"video player",volume:"volume",seek:"seek","closed captions":"closed captions","current playback rate":"current playback rate","playback time":"playback time","media loading":"media loading",settings:"settings","audio tracks":"audio tracks",quality:"quality",play:"play",pause:"pause",mute:"mute",unmute:"unmute","chapter: {chapterName}":"chapter: {chapterName}",live:"live",Off:"Off","start airplay":"start airplay","stop airplay":"stop airplay","start casting":"start casting","stop casting":"stop casting","enter fullscreen mode":"enter fullscreen mode","exit fullscreen mode":"exit fullscreen mode","enter picture in picture mode":"enter picture in picture mode","exit picture in picture mode":"exit picture in picture mode","seek to live":"seek to live","playing live":"playing live","seek back {seekOffset} seconds":"seek back {seekOffset} seconds","seek forward {seekOffset} seconds":"seek forward {seekOffset} seconds","Network Error":"Network Error","Decode Error":"Decode Error","Source Not Supported":"Source Not Supported","Encryption Error":"Encryption Error","A network error caused the media download to fail.":"A network error caused the media download to fail.","A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.":"A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.","An unsupported error occurred. The server or network failed, or your browser does not support this format.":"An unsupported error occurred. The server or network failed, or your browser does not support this format.","The media is encrypted and there are no keys to decrypt it.":"The media is encrypted and there are no keys to decrypt it.",hour:"hour",hours:"hours",minute:"minute",minutes:"minutes",second:"second",seconds:"seconds","{time} remaining":"{time} remaining","{currentTime} of {totalTime}":"{currentTime} of {totalTime}","video not loaded, unknown time.":"video not loaded, unknown time."};var bh;const cn={en:p0};let ar=((bh=globalThis.navigator)==null?void 0:bh.language)||"en";const v0=t=>{ar=t},f0=t=>{var e,i,a;const[r]=ar.split("-");return((e=cn[ar])==null?void 0:e[t])||((i=cn[r])==null?void 0:i[t])||((a=cn.en)==null?void 0:a[t])||t},E0=()=>{const[t]=ar.split("-");return cn[ar]?ar:cn[t]?t:"en"},R=(t,e={})=>f0(t).replace(/\{(\w+)\}/g,(i,a)=>a in e?String(e[a]):`{${a}}`),gh=[{singular:"hour",plural:"hours"},{singular:"minute",plural:"minutes"},{singular:"second",plural:"seconds"}],_0=(t,e)=>{const i=R(t===1?gh[e].singular:gh[e].plural);return`${t} ${i}`},hn=t=>{if(!Su(t))return"";const e=Math.abs(t),i=e!==t,a=new Date(0,0,0,0,0,e,0),n=[a.getHours(),a.getMinutes(),a.getSeconds()].map((s,o)=>s&&_0(s,o)).filter(s=>s).join(", ");return i?R("{time} remaining",{time:n}):n};function Bi(t,e){let i=!1;t<0&&(i=!0,t=0-t),t=t<0?0:t;let a=Math.floor(t%60),r=Math.floor(t/60%60),n=Math.floor(t/3600);const s=Math.floor(e/60%60),o=Math.floor(e/3600);return(isNaN(t)||t===1/0)&&(n=r=a="0"),n=n>0||o>0?n+":":"",r=((n||s>=10)&&r<10?"0"+r:r)+":",a=a<10?"0"+a:a,(i?"-":"")+n+r+a}let Cp=class{addEventListener(){}removeEventListener(){}dispatchEvent(){return!0}};class Dp extends Cp{}let yh=class extends Dp{constructor(){super(...arguments),this.role=null}};class b0{observe(){}unobserve(){}disconnect(){}}const Mp={createElement:function(){return new In.HTMLElement},createElementNS:function(){return new In.HTMLElement},addEventListener(){},removeEventListener(){},dispatchEvent(t){return!1}},In={ResizeObserver:b0,document:Mp,Node:Dp,Element:yh,HTMLElement:class extends yh{constructor(){super(...arguments),this.innerHTML=""}get content(){return new In.DocumentFragment}},DocumentFragment:class extends Cp{},customElements:{get:function(){},define:function(){},whenDefined:function(){}},localStorage:{getItem(t){return null},setItem(t,e){},removeItem(t){}},CustomEvent:function(){},getComputedStyle:function(){},navigator:{languages:[],get userAgent(){return""}},matchMedia(t){return{matches:!1,media:t}},DOMParser:class{parseFromString(e,i){return{body:{textContent:e}}}}},Op="global"in globalThis&&globalThis?.global===globalThis||typeof window>"u"||typeof window.customElements>"u",xp=Object.keys(In).every(t=>t in globalThis),_=Op&&!xp?In:globalThis,ye=Op&&!xp?Mp:globalThis.document,Th=new WeakMap,wu=t=>{let e=Th.get(t);return e||Th.set(t,e=new Set),e},Np=new _.ResizeObserver(t=>{for(const e of t)for(const i of wu(e.target))i(e)});function hr(t,e){wu(t).add(e),Np.observe(t)}function mr(t,e){const i=wu(t);i.delete(e),i.size||Np.unobserve(t)}function tt(t){const e={};for(const i of t)e[i.name]=i.value;return e}function Ye(t){var e;return(e=id(t))!=null?e:_r(t,"media-controller")}function id(t){var e;const{MEDIA_CONTROLLER:i}=Q,a=t.getAttribute(i);if(a)return(e=il(t))==null?void 0:e.getElementById(a)}const Pp=(t,e,i=".value")=>{const a=t.querySelector(i);a&&(a.textContent=e)},g0=(t,e)=>{const i=`slot[name="${e}"]`,a=t.shadowRoot.querySelector(i);return a?a.children:[]},$p=(t,e)=>g0(t,e)[0],_i=(t,e)=>!t||!e?!1:t?.contains(e)?!0:_i(t,e.getRootNode().host),_r=(t,e)=>{if(!t)return null;const i=t.closest(e);return i||_r(t.getRootNode().host,e)};function Iu(t=document){var e;const i=t?.activeElement;return i?(e=Iu(i.shadowRoot))!=null?e:i:null}function il(t){var e;const i=(e=t?.getRootNode)==null?void 0:e.call(t);return i instanceof ShadowRoot||i instanceof Document?i:null}function Up(t,{depth:e=3,checkOpacity:i=!0,checkVisibilityCSS:a=!0}={}){if(t.checkVisibility)return t.checkVisibility({checkOpacity:i,checkVisibilityCSS:a});let r=t;for(;r&&e>0;){const n=getComputedStyle(r);if(i&&n.opacity==="0"||a&&n.visibility==="hidden"||n.display==="none")return!1;r=r.parentElement,e--}return!0}function y0(t,e,i,a){const r=a.x-i.x,n=a.y-i.y,s=r*r+n*n;if(s===0)return 0;const o=((t-i.x)*r+(e-i.y)*n)/s;return Math.max(0,Math.min(1,o))}function ke(t,e){const i=T0(t,a=>a===e);return i||Ru(t,e)}function T0(t,e){var i,a;let r;for(r of(i=t.querySelectorAll("style:not([media])"))!=null?i:[]){let n;try{n=(a=r.sheet)==null?void 0:a.cssRules}catch{continue}for(const s of n??[])if(e(s.selectorText))return s}}function Ru(t,e){var i,a;const r=(i=t.querySelectorAll("style:not([media])"))!=null?i:[],n=r?.[r.length-1];if(!n?.sheet)return console.warn("Media Chrome: No style sheet found on style tag of",t),{style:{setProperty:()=>{},removeProperty:()=>"",getPropertyValue:()=>""}};const s=n?.sheet.insertRule(`${e}{}`,n.sheet.cssRules.length);return(a=n.sheet.cssRules)==null?void 0:a[s]}function ie(t,e,i=Number.NaN){const a=t.getAttribute(e);return a!=null?+a:i}function ce(t,e,i){const a=+i;if(i==null||Number.isNaN(a)){t.hasAttribute(e)&&t.removeAttribute(e);return}ie(t,e,void 0)!==a&&t.setAttribute(e,`${a}`)}function q(t,e){return t.hasAttribute(e)}function Y(t,e,i){if(i==null){t.hasAttribute(e)&&t.removeAttribute(e);return}q(t,e)!=i&&t.toggleAttribute(e,i)}function oe(t,e,i=null){var a;return(a=t.getAttribute(e))!=null?a:i}function ae(t,e,i){if(i==null){t.hasAttribute(e)&&t.removeAttribute(e);return}const a=`${i}`;oe(t,e,void 0)!==a&&t.setAttribute(e,a)}var Hp=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},vt=(t,e,i)=>(Hp(t,e,"read from private field"),i?i.call(t):e.get(t)),A0=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Vn=(t,e,i,a)=>(Hp(t,e,"write to private field"),e.set(t,i),i),Oe;function k0(t){return`
    <style>
      :host {
        display: var(--media-control-display, var(--media-gesture-receiver-display, inline-block));
        box-sizing: border-box;
      }
    </style>
  `}class al extends _.HTMLElement{constructor(){if(super(),A0(this,Oe,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[Q.MEDIA_CONTROLLER,c.MEDIA_PAUSED]}attributeChangedCallback(e,i,a){var r,n,s,o,l;e===Q.MEDIA_CONTROLLER&&(i&&((n=(r=vt(this,Oe))==null?void 0:r.unassociateElement)==null||n.call(r,this),Vn(this,Oe,null)),a&&this.isConnected&&(Vn(this,Oe,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=vt(this,Oe))==null?void 0:o.associateElement)==null||l.call(o,this)))}connectedCallback(){var e,i;this.tabIndex=-1,this.setAttribute("aria-hidden","true"),Vn(this,Oe,S0(this)),this.getAttribute(Q.MEDIA_CONTROLLER)&&((i=(e=vt(this,Oe))==null?void 0:e.associateElement)==null||i.call(e,this)),vt(this,Oe)&&(vt(this,Oe).addEventListener("pointerdown",this),vt(this,Oe).addEventListener("click",this),vt(this,Oe).hasAttribute("tabindex")||(vt(this,Oe).tabIndex=0))}disconnectedCallback(){var e,i,a,r;this.getAttribute(Q.MEDIA_CONTROLLER)&&((i=(e=vt(this,Oe))==null?void 0:e.unassociateElement)==null||i.call(e,this)),(a=vt(this,Oe))==null||a.removeEventListener("pointerdown",this),(r=vt(this,Oe))==null||r.removeEventListener("click",this),Vn(this,Oe,null)}handleEvent(e){var i;const a=(i=e.composedPath())==null?void 0:i[0];if(["video","media-controller"].includes(a?.localName)){if(e.type==="pointerdown")this._pointerType=e.pointerType;else if(e.type==="click"){const{clientX:n,clientY:s}=e,{left:o,top:l,width:u,height:m}=this.getBoundingClientRect(),p=n-o,h=s-l;if(p<0||h<0||p>u||h>m||u===0&&m===0)return;const d=this._pointerType||"mouse";if(this._pointerType=void 0,d===Cl.TOUCH){this.handleTap(e);return}else if(d===Cl.MOUSE||d===Cl.PEN){this.handleMouseClick(e);return}}}}get mediaPaused(){return q(this,c.MEDIA_PAUSED)}set mediaPaused(e){Y(this,c.MEDIA_PAUSED,e)}handleTap(e){}handleMouseClick(e){const i=this.mediaPaused?L.MEDIA_PLAY_REQUEST:L.MEDIA_PAUSE_REQUEST;this.dispatchEvent(new _.CustomEvent(i,{composed:!0,bubbles:!0}))}}Oe=new WeakMap;al.shadowRootOptions={mode:"open"};al.getTemplateHTML=k0;function S0(t){var e;const i=t.getAttribute(Q.MEDIA_CONTROLLER);return i?(e=t.getRootNode())==null?void 0:e.getElementById(i):_r(t,"media-controller")}_.customElements.get("media-gesture-receiver")||_.customElements.define("media-gesture-receiver",al);var Ah=al,Lu=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},he=(t,e,i)=>(Lu(t,e,"read from private field"),i?i.call(t):e.get(t)),Fe=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},_t=(t,e,i,a)=>(Lu(t,e,"write to private field"),e.set(t,i),i),wt=(t,e,i)=>(Lu(t,e,"access private method"),i),Kr,ko,Ia,pr,ja,ad,Ra,gs,rd,Bp,nd,Wp,Rn,rl,nl,Cu,vr,Ln,Ti,ys;const N={AUDIO:"audio",AUTOHIDE:"autohide",BREAKPOINTS:"breakpoints",GESTURES_DISABLED:"gesturesdisabled",KEYBOARD_CONTROL:"keyboardcontrol",NO_AUTOHIDE:"noautohide",USER_INACTIVE:"userinactive",AUTOHIDE_OVER_CONTROLS:"autohideovercontrols"};function w0(t){return`
    <style>
      
      :host([${c.MEDIA_IS_FULLSCREEN}]) ::slotted([slot=media]) {
        outline: none;
      }

      :host {
        box-sizing: border-box;
        position: relative;
        display: inline-block;
        line-height: 0;
        background-color: var(--media-background-color, #000);
        overflow: hidden;
      }

      :host(:not([${N.AUDIO}])) [part~=layer]:not([part~=media-layer]) {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        flex-flow: column nowrap;
        align-items: start;
        pointer-events: none;
        background: none;
      }

      slot[name=media] {
        display: var(--media-slot-display, contents);
      }

      
      :host([${N.AUDIO}]) slot[name=media] {
        display: var(--media-slot-display, none);
      }

      
      :host([${N.AUDIO}]) [part~=layer][part~=gesture-layer] {
        height: 0;
        display: block;
      }

      
      :host(:not([${N.AUDIO}])[${N.GESTURES_DISABLED}]) ::slotted([slot=gestures-chrome]),
          :host(:not([${N.AUDIO}])[${N.GESTURES_DISABLED}]) media-gesture-receiver[slot=gestures-chrome] {
        display: none;
      }

      
      ::slotted(:not([slot=media]):not([slot=poster]):not(media-loading-indicator):not([role=dialog]):not([hidden])) {
        pointer-events: auto;
      }

      :host(:not([${N.AUDIO}])) *[part~=layer][part~=centered-layer] {
        align-items: center;
        justify-content: center;
      }

      :host(:not([${N.AUDIO}])) ::slotted(media-gesture-receiver[slot=gestures-chrome]),
      :host(:not([${N.AUDIO}])) media-gesture-receiver[slot=gestures-chrome] {
        align-self: stretch;
        flex-grow: 1;
      }

      slot[name=middle-chrome] {
        display: inline;
        flex-grow: 1;
        pointer-events: none;
        background: none;
      }

      
      ::slotted([slot=media]),
      ::slotted([slot=poster]) {
        width: 100%;
        height: 100%;
      }

      
      :host(:not([${N.AUDIO}])) .spacer {
        flex-grow: 1;
      }

      
      :host(:-webkit-full-screen) {
        
        width: 100% !important;
        height: 100% !important;
      }

      
      ::slotted(:not([slot=media]):not([slot=poster]):not([${N.NO_AUTOHIDE}]):not([hidden]):not([role=dialog])) {
        opacity: 1;
        transition: var(--media-control-transition-in, opacity 0.25s);
      }

      
      :host([${N.USER_INACTIVE}]:not([${c.MEDIA_PAUSED}]):not([${c.MEDIA_IS_AIRPLAYING}]):not([${c.MEDIA_IS_CASTING}]):not([${N.AUDIO}])) ::slotted(:not([slot=media]):not([slot=poster]):not([${N.NO_AUTOHIDE}]):not([role=dialog])) {
        opacity: 0;
        transition: var(--media-control-transition-out, opacity 1s);
      }

      :host([${N.USER_INACTIVE}]:not([${N.NO_AUTOHIDE}]):not([${c.MEDIA_PAUSED}]):not([${c.MEDIA_IS_CASTING}]):not([${N.AUDIO}])) ::slotted([slot=media]) {
        cursor: none;
      }

      :host([${N.USER_INACTIVE}][${N.AUTOHIDE_OVER_CONTROLS}]:not([${N.NO_AUTOHIDE}]):not([${c.MEDIA_PAUSED}]):not([${c.MEDIA_IS_CASTING}]):not([${N.AUDIO}])) * {
        --media-cursor: none;
        cursor: none;
      }


      ::slotted(media-control-bar)  {
        align-self: stretch;
      }

      
      :host(:not([${N.AUDIO}])[${c.MEDIA_HAS_PLAYED}]) slot[name=poster] {
        display: none;
      }

      ::slotted([role=dialog]) {
        width: 100%;
        height: 100%;
        align-self: center;
      }

      ::slotted([role=menu]) {
        align-self: end;
      }
    </style>

    <slot name="media" part="layer media-layer"></slot>
    <slot name="poster" part="layer poster-layer"></slot>
    <slot name="gestures-chrome" part="layer gesture-layer">
      <media-gesture-receiver slot="gestures-chrome">
        <template shadowrootmode="${Ah.shadowRootOptions.mode}">
          ${Ah.getTemplateHTML({})}
        </template>
      </media-gesture-receiver>
    </slot>
    <span part="layer vertical-layer">
      <slot name="top-chrome" part="top chrome"></slot>
      <slot name="middle-chrome" part="middle chrome"></slot>
      <slot name="centered-chrome" part="layer centered-layer center centered chrome"></slot>
      
      <slot part="bottom chrome"></slot>
    </span>
    <slot name="dialog" part="layer dialog-layer"></slot>
  `}const I0=Object.values(c),R0="sm:384 md:576 lg:768 xl:960";function L0(t){Fp(t.target,t.contentRect.width)}function Fp(t,e){var i;if(!t.isConnected)return;const a=(i=t.getAttribute(N.BREAKPOINTS))!=null?i:R0,r=C0(a),n=D0(r,e);let s=!1;if(Object.keys(r).forEach(o=>{if(n.includes(o)){t.hasAttribute(`breakpoint${o}`)||(t.setAttribute(`breakpoint${o}`,""),s=!0);return}t.hasAttribute(`breakpoint${o}`)&&(t.removeAttribute(`breakpoint${o}`),s=!0)}),s){const o=new CustomEvent(Xt.BREAKPOINTS_CHANGE,{detail:n});t.dispatchEvent(o)}t.breakpointsComputed||(t.breakpointsComputed=!0,t.dispatchEvent(new CustomEvent(Xt.BREAKPOINTS_COMPUTED,{bubbles:!0,composed:!0})))}function C0(t){const e=t.split(/\s+/);return Object.fromEntries(e.map(i=>i.split(":")))}function D0(t,e){return Object.keys(t).filter(i=>e>=parseInt(t[i]))}class sl extends _.HTMLElement{constructor(){if(super(),Fe(this,rd),Fe(this,nd),Fe(this,Rn),Fe(this,nl),Fe(this,vr),Fe(this,Kr,void 0),Fe(this,ko,0),Fe(this,Ia,null),Fe(this,pr,null),Fe(this,ja,void 0),this.breakpointsComputed=!1,Fe(this,ad,e=>{const i=this.media;for(const a of e){if(a.type!=="childList")continue;const r=a.removedNodes;for(const n of r){if(n.slot!="media"||a.target!=this)continue;let s=a.previousSibling&&a.previousSibling.previousElementSibling;if(!s||!i)this.mediaUnsetCallback(n);else{let o=s.slot!=="media";for(;(s=s.previousSibling)!==null;)s.slot=="media"&&(o=!1);o&&this.mediaUnsetCallback(n)}}if(i)for(const n of a.addedNodes)n===i&&this.handleMediaUpdated(i)}}),Fe(this,Ra,!1),Fe(this,gs,e=>{he(this,Ra)||(setTimeout(()=>{L0(e),_t(this,Ra,!1)},0),_t(this,Ra,!0))}),Fe(this,Ti,void 0),Fe(this,ys,()=>{if(!he(this,Ti).assignedElements({flatten:!0}).length){he(this,Ia)&&this.mediaUnsetCallback(he(this,Ia));return}this.handleMediaUpdated(this.media)}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes),i=this.constructor.getTemplateHTML(e);this.shadowRoot.setHTMLUnsafe?this.shadowRoot.setHTMLUnsafe(i):this.shadowRoot.innerHTML=i}_t(this,Kr,new MutationObserver(he(this,ad)))}static get observedAttributes(){return[N.AUTOHIDE,N.GESTURES_DISABLED].concat(I0).filter(e=>![c.MEDIA_RENDITION_LIST,c.MEDIA_AUDIO_TRACK_LIST,c.MEDIA_CHAPTERS_CUES,c.MEDIA_WIDTH,c.MEDIA_HEIGHT,c.MEDIA_ERROR,c.MEDIA_ERROR_MESSAGE].includes(e))}attributeChangedCallback(e,i,a){e.toLowerCase()==N.AUTOHIDE&&(this.autohide=a)}get media(){let e=this.querySelector(":scope > [slot=media]");return e?.nodeName=="SLOT"&&(e=e.assignedElements({flatten:!0})[0]),e}async handleMediaUpdated(e){e&&(_t(this,Ia,e),e.localName.includes("-")&&await _.customElements.whenDefined(e.localName),this.mediaSetCallback(e))}connectedCallback(){var e;he(this,Kr).observe(this,{childList:!0,subtree:!0}),hr(this,he(this,gs));const i=this.getAttribute(N.AUDIO)!=null,a=R(i?"audio player":"video player");this.setAttribute("role","region"),this.setAttribute("aria-label",a),this.handleMediaUpdated(this.media),this.setAttribute(N.USER_INACTIVE,""),Fp(this,this.getBoundingClientRect().width);const r=this.querySelector(":scope > slot[slot=media]");r&&(_t(this,Ti,r),he(this,Ti).addEventListener("slotchange",he(this,ys))),this.addEventListener("pointerdown",this),this.addEventListener("pointermove",this),this.addEventListener("pointerup",this),this.addEventListener("mouseleave",this),this.addEventListener("keyup",this),(e=_.window)==null||e.addEventListener("mouseup",this)}disconnectedCallback(){var e;mr(this,he(this,gs)),clearTimeout(he(this,pr)),he(this,Kr).disconnect(),this.media&&this.mediaUnsetCallback(this.media),(e=_.window)==null||e.removeEventListener("mouseup",this),this.removeEventListener("pointerdown",this),this.removeEventListener("pointermove",this),this.removeEventListener("pointerup",this),this.removeEventListener("mouseleave",this),this.removeEventListener("keyup",this),he(this,Ti)&&(he(this,Ti).removeEventListener("slotchange",he(this,ys)),_t(this,Ti,null)),_t(this,Ra,!1)}mediaSetCallback(e){}mediaUnsetCallback(e){_t(this,Ia,null)}handleEvent(e){switch(e.type){case"pointerdown":_t(this,ko,e.timeStamp);break;case"pointermove":wt(this,rd,Bp).call(this,e);break;case"pointerup":wt(this,nd,Wp).call(this,e);break;case"mouseleave":wt(this,Rn,rl).call(this);break;case"mouseup":this.removeAttribute(N.KEYBOARD_CONTROL);break;case"keyup":wt(this,vr,Ln).call(this),this.setAttribute(N.KEYBOARD_CONTROL,"");break}}set autohide(e){const i=Number(e);_t(this,ja,isNaN(i)?0:i)}get autohide(){return(he(this,ja)===void 0?2:he(this,ja)).toString()}get breakpoints(){return oe(this,N.BREAKPOINTS)}set breakpoints(e){ae(this,N.BREAKPOINTS,e)}get audio(){return q(this,N.AUDIO)}set audio(e){Y(this,N.AUDIO,e)}get gesturesDisabled(){return q(this,N.GESTURES_DISABLED)}set gesturesDisabled(e){Y(this,N.GESTURES_DISABLED,e)}get keyboardControl(){return q(this,N.KEYBOARD_CONTROL)}set keyboardControl(e){Y(this,N.KEYBOARD_CONTROL,e)}get noAutohide(){return q(this,N.NO_AUTOHIDE)}set noAutohide(e){Y(this,N.NO_AUTOHIDE,e)}get autohideOverControls(){return q(this,N.AUTOHIDE_OVER_CONTROLS)}set autohideOverControls(e){Y(this,N.AUTOHIDE_OVER_CONTROLS,e)}get userInteractive(){return q(this,N.USER_INACTIVE)}set userInteractive(e){Y(this,N.USER_INACTIVE,e)}}Kr=new WeakMap;ko=new WeakMap;Ia=new WeakMap;pr=new WeakMap;ja=new WeakMap;ad=new WeakMap;Ra=new WeakMap;gs=new WeakMap;rd=new WeakSet;Bp=function(t){if(t.pointerType!=="mouse"&&t.timeStamp-he(this,ko)<250)return;wt(this,nl,Cu).call(this),clearTimeout(he(this,pr));const e=this.hasAttribute(N.AUTOHIDE_OVER_CONTROLS);([this,this.media].includes(t.target)||e)&&wt(this,vr,Ln).call(this)};nd=new WeakSet;Wp=function(t){if(t.pointerType==="touch"){const e=!this.hasAttribute(N.USER_INACTIVE);[this,this.media].includes(t.target)&&e?wt(this,Rn,rl).call(this):wt(this,vr,Ln).call(this)}else t.composedPath().some(e=>["media-play-button","media-fullscreen-button"].includes(e?.localName))&&wt(this,vr,Ln).call(this)};Rn=new WeakSet;rl=function(){if(he(this,ja)<0||this.hasAttribute(N.USER_INACTIVE))return;this.setAttribute(N.USER_INACTIVE,"");const t=new _.CustomEvent(Xt.USER_INACTIVE_CHANGE,{composed:!0,bubbles:!0,detail:!0});this.dispatchEvent(t)};nl=new WeakSet;Cu=function(){if(!this.hasAttribute(N.USER_INACTIVE))return;this.removeAttribute(N.USER_INACTIVE);const t=new _.CustomEvent(Xt.USER_INACTIVE_CHANGE,{composed:!0,bubbles:!0,detail:!1});this.dispatchEvent(t)};vr=new WeakSet;Ln=function(){wt(this,nl,Cu).call(this),clearTimeout(he(this,pr));const t=parseInt(this.autohide);t<0||_t(this,pr,setTimeout(()=>{wt(this,Rn,rl).call(this)},t*1e3))};Ti=new WeakMap;ys=new WeakMap;sl.shadowRootOptions={mode:"open"};sl.getTemplateHTML=w0;_.customElements.get("media-container")||_.customElements.define("media-container",sl);var Kp=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Le=(t,e,i)=>(Kp(t,e,"read from private field"),i?i.call(t):e.get(t)),wr=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},qn=(t,e,i,a)=>(Kp(t,e,"write to private field"),e.set(t,i),i),La,Ca,So,oa,ri,Ai;class Du{constructor(e,i,{defaultValue:a}={defaultValue:void 0}){wr(this,ri),wr(this,La,void 0),wr(this,Ca,void 0),wr(this,So,void 0),wr(this,oa,new Set),qn(this,La,e),qn(this,Ca,i),qn(this,So,new Set(a))}[Symbol.iterator](){return Le(this,ri,Ai).values()}get length(){return Le(this,ri,Ai).size}get value(){var e;return(e=[...Le(this,ri,Ai)].join(" "))!=null?e:""}set value(e){var i;e!==this.value&&(qn(this,oa,new Set),this.add(...(i=e?.split(" "))!=null?i:[]))}toString(){return this.value}item(e){return[...Le(this,ri,Ai)][e]}values(){return Le(this,ri,Ai).values()}forEach(e,i){Le(this,ri,Ai).forEach(e,i)}add(...e){var i,a;e.forEach(r=>Le(this,oa).add(r)),!(this.value===""&&!((i=Le(this,La))!=null&&i.hasAttribute(`${Le(this,Ca)}`)))&&((a=Le(this,La))==null||a.setAttribute(`${Le(this,Ca)}`,`${this.value}`))}remove(...e){var i;e.forEach(a=>Le(this,oa).delete(a)),(i=Le(this,La))==null||i.setAttribute(`${Le(this,Ca)}`,`${this.value}`)}contains(e){return Le(this,ri,Ai).has(e)}toggle(e,i){return typeof i<"u"?i?(this.add(e),!0):(this.remove(e),!1):this.contains(e)?(this.remove(e),!1):(this.add(e),!0)}replace(e,i){return this.remove(e),this.add(i),e===i}}La=new WeakMap;Ca=new WeakMap;So=new WeakMap;oa=new WeakMap;ri=new WeakSet;Ai=function(){return Le(this,oa).size?Le(this,oa):Le(this,So)};const M0=(t="")=>t.split(/\s+/),Vp=(t="")=>{const[e,i,a]=t.split(":"),r=a?decodeURIComponent(a):void 0;return{kind:e==="cc"?jt.CAPTIONS:jt.SUBTITLES,language:i,label:r}},ol=(t="",e={})=>M0(t).map(i=>{const a=Vp(i);return{...e,...a}}),qp=t=>t?Array.isArray(t)?t.map(e=>typeof e=="string"?Vp(e):e):typeof t=="string"?ol(t):[t]:[],sd=({kind:t,label:e,language:i}={kind:"subtitles"})=>e?`${t==="captions"?"cc":"sb"}:${i}:${encodeURIComponent(e)}`:i,Cn=(t=[])=>Array.prototype.map.call(t,sd).join(" "),O0=(t,e)=>i=>i[t]===e,Yp=t=>{const e=Object.entries(t).map(([i,a])=>O0(i,a));return i=>e.every(a=>a(i))},mn=(t,e=[],i=[])=>{const a=qp(i).map(Yp),r=n=>a.some(s=>s(n));Array.from(e).filter(r).forEach(n=>{n.mode=t})},ll=(t,e=()=>!0)=>{if(!t?.textTracks)return[];const i=typeof e=="function"?e:Yp(e);return Array.from(t.textTracks).filter(i)},Gp=t=>{var e;return!!((e=t.mediaSubtitlesShowing)!=null&&e.length)||t.hasAttribute(c.MEDIA_SUBTITLES_SHOWING)},x0=t=>{var e;const{media:i,fullscreenElement:a}=t;try{const r=a&&"requestFullscreen"in a?"requestFullscreen":a&&"webkitRequestFullScreen"in a?"webkitRequestFullScreen":void 0;if(r){const n=(e=a[r])==null?void 0:e.call(a);if(n instanceof Promise)return n.catch(()=>{})}else i?.webkitEnterFullscreen?i.webkitEnterFullscreen():i?.requestFullscreen&&i.requestFullscreen()}catch(r){console.error(r)}},kh="exitFullscreen"in ye?"exitFullscreen":"webkitExitFullscreen"in ye?"webkitExitFullscreen":"webkitCancelFullScreen"in ye?"webkitCancelFullScreen":void 0,N0=t=>{var e;const{documentElement:i}=t;if(kh){const a=(e=i?.[kh])==null?void 0:e.call(i);if(a instanceof Promise)return a.catch(()=>{})}},Vr="fullscreenElement"in ye?"fullscreenElement":"webkitFullscreenElement"in ye?"webkitFullscreenElement":void 0,P0=t=>{const{documentElement:e,media:i}=t,a=e?.[Vr];return!a&&"webkitDisplayingFullscreen"in i&&"webkitPresentationMode"in i&&i.webkitDisplayingFullscreen&&i.webkitPresentationMode===r0.FULLSCREEN?i:a},$0=t=>{var e;const{media:i,documentElement:a,fullscreenElement:r=i}=t;if(!i||!a)return!1;const n=P0(t);if(!n)return!1;if(n===r||n===i)return!0;if(n.localName.includes("-")){let s=n.shadowRoot;if(!(Vr in s))return _i(n,r);for(;s?.[Vr];){if(s[Vr]===r)return!0;s=(e=s[Vr])==null?void 0:e.shadowRoot}}return!1},U0="fullscreenEnabled"in ye?"fullscreenEnabled":"webkitFullscreenEnabled"in ye?"webkitFullscreenEnabled":void 0,H0=t=>{const{documentElement:e,media:i}=t;return!!e?.[U0]||i&&"webkitSupportsFullscreen"in i};let Yn;const Mu=()=>{var t,e;return Yn||(Yn=(e=(t=ye)==null?void 0:t.createElement)==null?void 0:e.call(t,"video"),Yn)},B0=async(t=Mu())=>{if(!t)return!1;const e=t.volume;t.volume=e/2+.1;const i=new AbortController,a=await Promise.race([W0(t,i.signal),F0(t,e)]);return i.abort(),a},W0=(t,e)=>new Promise(i=>{t.addEventListener("volumechange",()=>i(!0),{signal:e})}),F0=async(t,e)=>{for(let i=0;i<10;i++){if(t.volume===e)return!1;await Lp(10)}return t.volume!==e},K0=/.*Version\/.*Safari\/.*/.test(_.navigator.userAgent),zp=(t=Mu())=>_.matchMedia("(display-mode: standalone)").matches&&K0?!1:typeof t?.requestPictureInPicture=="function",Qp=(t=Mu())=>H0({documentElement:ye,media:t}),V0=Qp(),q0=zp(),Y0=!!_.WebKitPlaybackTargetAvailabilityEvent,G0=!!_.chrome,wo=t=>ll(t.media,e=>[jt.SUBTITLES,jt.CAPTIONS].includes(e.kind)).sort((e,i)=>e.kind>=i.kind?1:-1),jp=t=>ll(t.media,e=>e.mode===ir.SHOWING&&[jt.SUBTITLES,jt.CAPTIONS].includes(e.kind)),Zp=(t,e)=>{const i=wo(t),a=jp(t),r=!!a.length;if(i.length){if(e===!1||r&&e!==!0)mn(ir.DISABLED,i,a);else if(e===!0||!r&&e!==!1){let n=i[0];const{options:s}=t;if(!s?.noSubtitlesLangPref){const m=_.localStorage.getItem("media-chrome-pref-subtitles-lang"),p=m?[m,..._.navigator.languages]:_.navigator.languages,h=i.filter(d=>p.some(v=>d.language.toLowerCase().startsWith(v.split("-")[0]))).sort((d,v)=>{const E=p.findIndex(y=>d.language.toLowerCase().startsWith(y.split("-")[0])),b=p.findIndex(y=>v.language.toLowerCase().startsWith(y.split("-")[0]));return E-b});h[0]&&(n=h[0])}const{language:o,label:l,kind:u}=n;mn(ir.DISABLED,i,a),mn(ir.SHOWING,i,[{language:o,label:l,kind:u}])}}},Ou=(t,e)=>t===e?!0:t==null||e==null||typeof t!=typeof e?!1:typeof t=="number"&&Number.isNaN(t)&&Number.isNaN(e)?!0:typeof t!="object"?!1:Array.isArray(t)?z0(t,e):Object.entries(t).every(([i,a])=>i in e&&Ou(a,e[i])),z0=(t,e)=>{const i=Array.isArray(t),a=Array.isArray(e);return i!==a?!1:i||a?t.length!==e.length?!1:t.every((r,n)=>Ou(r,e[n])):!0},Q0=Object.values(di);let Io;const j0=B0().then(t=>(Io=t,Io)),Z0=async(...t)=>{await Promise.all(t.filter(e=>e).map(async e=>{if(!("localName"in e&&e instanceof _.HTMLElement))return;const i=e.localName;if(!i.includes("-"))return;const a=_.customElements.get(i);a&&e instanceof a||(await _.customElements.whenDefined(i),_.customElements.upgrade(e))}))},X0=new _.DOMParser,J0=t=>t&&(X0.parseFromString(t,"text/html").body.textContent||t),qr={mediaError:{get(t,e){const{media:i}=t;if(e?.type!=="playing")return i?.error},mediaEvents:["emptied","error","playing"]},mediaErrorCode:{get(t,e){var i;const{media:a}=t;if(e?.type!=="playing")return(i=a?.error)==null?void 0:i.code},mediaEvents:["emptied","error","playing"]},mediaErrorMessage:{get(t,e){var i,a;const{media:r}=t;if(e?.type!=="playing")return(a=(i=r?.error)==null?void 0:i.message)!=null?a:""},mediaEvents:["emptied","error","playing"]},mediaWidth:{get(t){var e;const{media:i}=t;return(e=i?.videoWidth)!=null?e:0},mediaEvents:["resize"]},mediaHeight:{get(t){var e;const{media:i}=t;return(e=i?.videoHeight)!=null?e:0},mediaEvents:["resize"]},mediaPaused:{get(t){var e;const{media:i}=t;return(e=i?.paused)!=null?e:!0},set(t,e){var i;const{media:a}=e;a&&(t?a.pause():(i=a.play())==null||i.catch(()=>{}))},mediaEvents:["play","playing","pause","emptied"]},mediaHasPlayed:{get(t,e){const{media:i}=t;return i?e?e.type==="playing":!i.paused:!1},mediaEvents:["playing","emptied"]},mediaEnded:{get(t){var e;const{media:i}=t;return(e=i?.ended)!=null?e:!1},mediaEvents:["seeked","ended","emptied"]},mediaPlaybackRate:{get(t){var e;const{media:i}=t;return(e=i?.playbackRate)!=null?e:1},set(t,e){const{media:i}=e;i&&Number.isFinite(+t)&&(i.playbackRate=+t)},mediaEvents:["ratechange","loadstart"]},mediaMuted:{get(t){var e;const{media:i}=t;return(e=i?.muted)!=null?e:!1},set(t,e){const{media:i,options:{noMutedPref:a}={}}=e;if(i){i.muted=t;try{const r=_.localStorage.getItem("media-chrome-pref-muted")!==null,n=i.hasAttribute("muted");if(a){r&&_.localStorage.removeItem("media-chrome-pref-muted");return}if(n&&!r)return;_.localStorage.setItem("media-chrome-pref-muted",t?"true":"false")}catch(r){console.debug("Error setting muted pref",r)}}},mediaEvents:["volumechange"],stateOwnersUpdateHandlers:[(t,e)=>{const{options:{noMutedPref:i}}=e,{media:a}=e;if(!(!a||a.muted||i))try{const r=_.localStorage.getItem("media-chrome-pref-muted")==="true";qr.mediaMuted.set(r,e),t(r)}catch(r){console.debug("Error getting muted pref",r)}}]},mediaLoop:{get(t){const{media:e}=t;return e?.loop},set(t,e){const{media:i}=e;i&&(i.loop=t)},mediaEvents:["medialooprequest"]},mediaVolume:{get(t){var e;const{media:i}=t;return(e=i?.volume)!=null?e:1},set(t,e){const{media:i,options:{noVolumePref:a}={}}=e;if(i){try{t==null?_.localStorage.removeItem("media-chrome-pref-volume"):!i.hasAttribute("muted")&&!a&&_.localStorage.setItem("media-chrome-pref-volume",t.toString())}catch(r){console.debug("Error setting volume pref",r)}Number.isFinite(+t)&&(i.volume=+t)}},mediaEvents:["volumechange"],stateOwnersUpdateHandlers:[(t,e)=>{const{options:{noVolumePref:i}}=e;if(!i)try{const{media:a}=e;if(!a)return;const r=_.localStorage.getItem("media-chrome-pref-volume");if(r==null)return;qr.mediaVolume.set(+r,e),t(+r)}catch(a){console.debug("Error getting volume pref",a)}}]},mediaVolumeLevel:{get(t){const{media:e}=t;return typeof e?.volume>"u"?"high":e.muted||e.volume===0?"off":e.volume<.5?"low":e.volume<.75?"medium":"high"},mediaEvents:["volumechange"]},mediaCurrentTime:{get(t){var e;const{media:i}=t;return(e=i?.currentTime)!=null?e:0},set(t,e){const{media:i}=e;!i||!Su(t)||(i.currentTime=t)},mediaEvents:["timeupdate","loadedmetadata"]},mediaDuration:{get(t){const{media:e,options:{defaultDuration:i}={}}=t;return i&&(!e||!e.duration||Number.isNaN(e.duration)||!Number.isFinite(e.duration))?i:Number.isFinite(e?.duration)?e.duration:Number.NaN},mediaEvents:["durationchange","loadedmetadata","emptied"]},mediaLoading:{get(t){const{media:e}=t;return e?.readyState<3},mediaEvents:["waiting","playing","emptied"]},mediaSeekable:{get(t){var e;const{media:i}=t;if(!((e=i?.seekable)!=null&&e.length))return;const a=i.seekable.start(0),r=i.seekable.end(i.seekable.length-1);if(!(!a&&!r))return[Number(a.toFixed(3)),Number(r.toFixed(3))]},mediaEvents:["loadedmetadata","emptied","progress","seekablechange"]},mediaBuffered:{get(t){var e;const{media:i}=t,a=(e=i?.buffered)!=null?e:[];return Array.from(a).map((r,n)=>[Number(a.start(n).toFixed(3)),Number(a.end(n).toFixed(3))])},mediaEvents:["progress","emptied"]},mediaStreamType:{get(t){const{media:e,options:{defaultStreamType:i}={}}=t,a=[di.LIVE,di.ON_DEMAND].includes(i)?i:void 0;if(!e)return a;const{streamType:r}=e;if(Q0.includes(r))return r===di.UNKNOWN?a:r;const n=e.duration;return n===1/0?di.LIVE:Number.isFinite(n)?di.ON_DEMAND:a},mediaEvents:["emptied","durationchange","loadedmetadata","streamtypechange"]},mediaTargetLiveWindow:{get(t){const{media:e}=t;if(!e)return Number.NaN;const{targetLiveWindow:i}=e,a=qr.mediaStreamType.get(t);return(i==null||Number.isNaN(i))&&a===di.LIVE?0:i},mediaEvents:["emptied","durationchange","loadedmetadata","streamtypechange","targetlivewindowchange"]},mediaTimeIsLive:{get(t){const{media:e,options:{liveEdgeOffset:i=10}={}}=t;if(!e)return!1;if(typeof e.liveEdgeStart=="number")return Number.isNaN(e.liveEdgeStart)?!1:e.currentTime>=e.liveEdgeStart;if(!(qr.mediaStreamType.get(t)===di.LIVE))return!1;const r=e.seekable;if(!r)return!0;if(!r.length)return!1;const n=r.end(r.length-1)-i;return e.currentTime>=n},mediaEvents:["playing","timeupdate","progress","waiting","emptied"]},mediaSubtitlesList:{get(t){return wo(t).map(({kind:e,label:i,language:a})=>({kind:e,label:i,language:a}))},mediaEvents:["loadstart"],textTracksEvents:["addtrack","removetrack"]},mediaSubtitlesShowing:{get(t){return jp(t).map(({kind:e,label:i,language:a})=>({kind:e,label:i,language:a}))},mediaEvents:["loadstart"],textTracksEvents:["addtrack","removetrack","change"],stateOwnersUpdateHandlers:[(t,e)=>{var i,a;const{media:r,options:n}=e;if(!r)return;const s=o=>{var l;!n.defaultSubtitles||o&&![jt.CAPTIONS,jt.SUBTITLES].includes((l=o?.track)==null?void 0:l.kind)||Zp(e,!0)};return r.addEventListener("loadstart",s),(i=r.textTracks)==null||i.addEventListener("addtrack",s),(a=r.textTracks)==null||a.addEventListener("removetrack",s),()=>{var o,l;r.removeEventListener("loadstart",s),(o=r.textTracks)==null||o.removeEventListener("addtrack",s),(l=r.textTracks)==null||l.removeEventListener("removetrack",s)}}]},mediaChaptersCues:{get(t){var e;const{media:i}=t;if(!i)return[];const[a]=ll(i,{kind:jt.CHAPTERS});return Array.from((e=a?.cues)!=null?e:[]).map(({text:r,startTime:n,endTime:s})=>({text:J0(r),startTime:n,endTime:s}))},mediaEvents:["loadstart","loadedmetadata"],textTracksEvents:["addtrack","removetrack","change"],stateOwnersUpdateHandlers:[(t,e)=>{var i;const{media:a}=e;if(!a)return;const r=a.querySelector('track[kind="chapters"][default][src]'),n=(i=a.shadowRoot)==null?void 0:i.querySelector(':is(video,audio) > track[kind="chapters"][default][src]');return r?.addEventListener("load",t),n?.addEventListener("load",t),()=>{r?.removeEventListener("load",t),n?.removeEventListener("load",t)}}]},mediaIsPip:{get(t){var e,i;const{media:a,documentElement:r}=t;if(!a||!r||!r.pictureInPictureElement)return!1;if(r.pictureInPictureElement===a)return!0;if(r.pictureInPictureElement instanceof HTMLMediaElement)return(e=a.localName)!=null&&e.includes("-")?_i(a,r.pictureInPictureElement):!1;if(r.pictureInPictureElement.localName.includes("-")){let n=r.pictureInPictureElement.shadowRoot;for(;n?.pictureInPictureElement;){if(n.pictureInPictureElement===a)return!0;n=(i=n.pictureInPictureElement)==null?void 0:i.shadowRoot}}return!1},set(t,e){const{media:i}=e;if(i)if(t){if(!ye.pictureInPictureEnabled){console.warn("MediaChrome: Picture-in-picture is not enabled");return}if(!i.requestPictureInPicture){console.warn("MediaChrome: The current media does not support picture-in-picture");return}const a=()=>{console.warn("MediaChrome: The media is not ready for picture-in-picture. It must have a readyState > 0.")};i.requestPictureInPicture().catch(r=>{if(r.code===11){if(!i.src){console.warn("MediaChrome: The media is not ready for picture-in-picture. It must have a src set.");return}if(i.readyState===0&&i.preload==="none"){const n=()=>{i.removeEventListener("loadedmetadata",s),i.preload="none"},s=()=>{i.requestPictureInPicture().catch(a),n()};i.addEventListener("loadedmetadata",s),i.preload="metadata",setTimeout(()=>{i.readyState===0&&a(),n()},1e3)}else throw r}else throw r})}else ye.pictureInPictureElement&&ye.exitPictureInPicture()},mediaEvents:["enterpictureinpicture","leavepictureinpicture"]},mediaRenditionList:{get(t){var e;const{media:i}=t;return[...(e=i?.videoRenditions)!=null?e:[]].map(a=>({...a}))},mediaEvents:["emptied","loadstart"],videoRenditionsEvents:["addrendition","removerendition"]},mediaRenditionSelected:{get(t){var e,i,a;const{media:r}=t;return(a=(i=r?.videoRenditions)==null?void 0:i[(e=r.videoRenditions)==null?void 0:e.selectedIndex])==null?void 0:a.id},set(t,e){const{media:i}=e;if(!i?.videoRenditions){console.warn("MediaController: Rendition selection not supported by this media.");return}const a=t,r=Array.prototype.findIndex.call(i.videoRenditions,n=>n.id==a);i.videoRenditions.selectedIndex!=r&&(i.videoRenditions.selectedIndex=r)},mediaEvents:["emptied"],videoRenditionsEvents:["addrendition","removerendition","change"]},mediaAudioTrackList:{get(t){var e;const{media:i}=t;return[...(e=i?.audioTracks)!=null?e:[]]},mediaEvents:["emptied","loadstart"],audioTracksEvents:["addtrack","removetrack"]},mediaAudioTrackEnabled:{get(t){var e,i;const{media:a}=t;return(i=[...(e=a?.audioTracks)!=null?e:[]].find(r=>r.enabled))==null?void 0:i.id},set(t,e){const{media:i}=e;if(!i?.audioTracks){console.warn("MediaChrome: Audio track selection not supported by this media.");return}const a=t;for(const r of i.audioTracks)r.enabled=a==r.id},mediaEvents:["emptied"],audioTracksEvents:["addtrack","removetrack","change"]},mediaIsFullscreen:{get(t){return $0(t)},set(t,e,i){var a,r;t?(x0(e),i.detail&&!((a=e.media)!=null&&a.inert)&&((r=e.media)==null||r.focus())):N0(e)},rootEvents:["fullscreenchange","webkitfullscreenchange"],mediaEvents:["webkitbeginfullscreen","webkitendfullscreen","webkitpresentationmodechanged"]},mediaIsCasting:{get(t){var e;const{media:i}=t;return!i?.remote||((e=i.remote)==null?void 0:e.state)==="disconnected"?!1:i.remote.state==="connected"},set(t,e){var i,a;const{media:r}=e;if(r&&!(t&&((i=r.remote)==null?void 0:i.state)!=="disconnected")&&!(!t&&((a=r.remote)==null?void 0:a.state)!=="connected")){if(typeof r.remote.prompt!="function"){console.warn("MediaChrome: Casting is not supported in this environment");return}r.remote.prompt().catch(()=>{})}},remoteEvents:["connect","connecting","disconnect"]},mediaIsAirplaying:{get(){return!1},set(t,e){const{media:i}=e;if(i){if(!(i.webkitShowPlaybackTargetPicker&&_.WebKitPlaybackTargetAvailabilityEvent)){console.error("MediaChrome: received a request to select AirPlay but AirPlay is not supported in this environment");return}i.webkitShowPlaybackTargetPicker()}},mediaEvents:["webkitcurrentplaybacktargetiswirelesschanged"]},mediaFullscreenUnavailable:{get(t){const{media:e}=t;if(!V0||!Qp(e))return Xe.UNSUPPORTED}},mediaPipUnavailable:{get(t){const{media:e}=t;if(!q0||!zp(e))return Xe.UNSUPPORTED;if(e?.disablePictureInPicture)return Xe.UNAVAILABLE}},mediaVolumeUnavailable:{get(t){const{media:e}=t;if(Io===!1||e?.volume==null)return Xe.UNSUPPORTED},stateOwnersUpdateHandlers:[t=>{Io==null&&j0.then(e=>t(e?void 0:Xe.UNSUPPORTED))}]},mediaCastUnavailable:{get(t,{availability:e="not-available"}={}){var i;const{media:a}=t;if(!G0||!((i=a?.remote)!=null&&i.state))return Xe.UNSUPPORTED;if(!(e==null||e==="available"))return Xe.UNAVAILABLE},stateOwnersUpdateHandlers:[(t,e)=>{var i;const{media:a}=e;return a?(a.disableRemotePlayback||a.hasAttribute("disableremoteplayback")||(i=a?.remote)==null||i.watchAvailability(n=>{t({availability:n?"available":"not-available"})}).catch(n=>{n.name==="NotSupportedError"?t({availability:null}):t({availability:"not-available"})}),()=>{var n;(n=a?.remote)==null||n.cancelWatchAvailability().catch(()=>{})}):void 0}]},mediaAirplayUnavailable:{get(t,e){if(!Y0)return Xe.UNSUPPORTED;if(e?.availability==="not-available")return Xe.UNAVAILABLE},mediaEvents:["webkitplaybacktargetavailabilitychanged"],stateOwnersUpdateHandlers:[(t,e)=>{var i;const{media:a}=e;return a?(a.disableRemotePlayback||a.hasAttribute("disableremoteplayback")||(i=a?.remote)==null||i.watchAvailability(n=>{t({availability:n?"available":"not-available"})}).catch(n=>{n.name==="NotSupportedError"?t({availability:null}):t({availability:"not-available"})}),()=>{var n;(n=a?.remote)==null||n.cancelWatchAvailability().catch(()=>{})}):void 0}]},mediaRenditionUnavailable:{get(t){var e;const{media:i}=t;if(!i?.videoRenditions)return Xe.UNSUPPORTED;if(!((e=i.videoRenditions)!=null&&e.length))return Xe.UNAVAILABLE},mediaEvents:["emptied","loadstart"],videoRenditionsEvents:["addrendition","removerendition"]},mediaAudioTrackUnavailable:{get(t){var e,i;const{media:a}=t;if(!a?.audioTracks)return Xe.UNSUPPORTED;if(((i=(e=a.audioTracks)==null?void 0:e.length)!=null?i:0)<=1)return Xe.UNAVAILABLE},mediaEvents:["emptied","loadstart"],audioTracksEvents:["addtrack","removetrack"]},mediaLang:{get(t){const{options:{mediaLang:e}={}}=t;return e??"en"}}},e1={[L.MEDIA_PREVIEW_REQUEST](t,e,{detail:i}){var a,r,n;const{media:s}=e,o=i??void 0;let l,u;if(s&&o!=null){const[d]=ll(s,{kind:jt.METADATA,label:"thumbnails"}),v=Array.prototype.find.call((a=d?.cues)!=null?a:[],(E,b,y)=>b===0?E.endTime>o:b===y.length-1?E.startTime<=o:E.startTime<=o&&E.endTime>o);if(v){const E=/'^(?:[a-z]+:)?\/\//i.test(v.text)||(r=s?.querySelector('track[label="thumbnails"]'))==null?void 0:r.src,b=new URL(v.text,E);u=new URLSearchParams(b.hash).get("#xywh").split(",").map(T=>+T),l=b.href}}const m=t.mediaDuration.get(e);let h=(n=t.mediaChaptersCues.get(e).find((d,v,E)=>v===E.length-1&&m===d.endTime?d.startTime<=o&&d.endTime>=o:d.startTime<=o&&d.endTime>o))==null?void 0:n.text;return i!=null&&h==null&&(h=""),{mediaPreviewTime:o,mediaPreviewImage:l,mediaPreviewCoords:u,mediaPreviewChapter:h}},[L.MEDIA_PAUSE_REQUEST](t,e){t["mediaPaused"].set(!0,e)},[L.MEDIA_PLAY_REQUEST](t,e){var i,a,r,n;const s="mediaPaused",l=t.mediaStreamType.get(e)===di.LIVE,u=!((i=e.options)!=null&&i.noAutoSeekToLive),m=t.mediaTargetLiveWindow.get(e)>0;if(l&&u&&!m){const p=(a=t.mediaSeekable.get(e))==null?void 0:a[1];if(p){const h=(n=(r=e.options)==null?void 0:r.seekToLiveOffset)!=null?n:0,d=p-h;t.mediaCurrentTime.set(d,e)}}t[s].set(!1,e)},[L.MEDIA_PLAYBACK_RATE_REQUEST](t,e,{detail:i}){const a="mediaPlaybackRate",r=i;t[a].set(r,e)},[L.MEDIA_MUTE_REQUEST](t,e){t["mediaMuted"].set(!0,e)},[L.MEDIA_UNMUTE_REQUEST](t,e){const i="mediaMuted";t.mediaVolume.get(e)||t.mediaVolume.set(.25,e),t[i].set(!1,e)},[L.MEDIA_LOOP_REQUEST](t,e,{detail:i}){const a="mediaLoop",r=!!i;return t[a].set(r,e),{mediaLoop:r}},[L.MEDIA_VOLUME_REQUEST](t,e,{detail:i}){const a="mediaVolume",r=i;r&&t.mediaMuted.get(e)&&t.mediaMuted.set(!1,e),t[a].set(r,e)},[L.MEDIA_SEEK_REQUEST](t,e,{detail:i}){const a="mediaCurrentTime",r=i;t[a].set(r,e)},[L.MEDIA_SEEK_TO_LIVE_REQUEST](t,e){var i,a,r;const n="mediaCurrentTime",s=(i=t.mediaSeekable.get(e))==null?void 0:i[1];if(Number.isNaN(Number(s)))return;const o=(r=(a=e.options)==null?void 0:a.seekToLiveOffset)!=null?r:0,l=s-o;t[n].set(l,e)},[L.MEDIA_SHOW_SUBTITLES_REQUEST](t,e,{detail:i}){var a;const{options:r}=e,n=wo(e),s=qp(i),o=(a=s[0])==null?void 0:a.language;o&&!r.noSubtitlesLangPref&&_.localStorage.setItem("media-chrome-pref-subtitles-lang",o),mn(ir.SHOWING,n,s)},[L.MEDIA_DISABLE_SUBTITLES_REQUEST](t,e,{detail:i}){const a=wo(e),r=i??[];mn(ir.DISABLED,a,r)},[L.MEDIA_TOGGLE_SUBTITLES_REQUEST](t,e,{detail:i}){Zp(e,i)},[L.MEDIA_RENDITION_REQUEST](t,e,{detail:i}){const a="mediaRenditionSelected",r=i;t[a].set(r,e)},[L.MEDIA_AUDIO_TRACK_REQUEST](t,e,{detail:i}){const a="mediaAudioTrackEnabled",r=i;t[a].set(r,e)},[L.MEDIA_ENTER_PIP_REQUEST](t,e){const i="mediaIsPip";t.mediaIsFullscreen.get(e)&&t.mediaIsFullscreen.set(!1,e),t[i].set(!0,e)},[L.MEDIA_EXIT_PIP_REQUEST](t,e){t["mediaIsPip"].set(!1,e)},[L.MEDIA_ENTER_FULLSCREEN_REQUEST](t,e,i){const a="mediaIsFullscreen";t.mediaIsPip.get(e)&&t.mediaIsPip.set(!1,e),t[a].set(!0,e,i)},[L.MEDIA_EXIT_FULLSCREEN_REQUEST](t,e){t["mediaIsFullscreen"].set(!1,e)},[L.MEDIA_ENTER_CAST_REQUEST](t,e){const i="mediaIsCasting";t.mediaIsFullscreen.get(e)&&t.mediaIsFullscreen.set(!1,e),t[i].set(!0,e)},[L.MEDIA_EXIT_CAST_REQUEST](t,e){t["mediaIsCasting"].set(!1,e)},[L.MEDIA_AIRPLAY_REQUEST](t,e){t["mediaIsAirplaying"].set(!0,e)}},t1=({media:t,fullscreenElement:e,documentElement:i,stateMediator:a=qr,requestMap:r=e1,options:n={},monitorStateOwnersOnlyWithSubscriptions:s=!0})=>{const o=[],l={options:{...n}};let u=Object.freeze({mediaPreviewTime:void 0,mediaPreviewImage:void 0,mediaPreviewCoords:void 0,mediaPreviewChapter:void 0});const m=E=>{E!=null&&(Ou(E,u)||(u=Object.freeze({...u,...E}),o.forEach(b=>b(u))))},p=()=>{const E=Object.entries(a).reduce((b,[y,{get:T}])=>(b[y]=T(l),b),{});m(E)},h={};let d;const v=async(E,b)=>{var y,T,g,k,D,C,$,B,G,W,U,Ne,ze,Qe,ve,He;const Rt=!!d;if(d={...l,...d??{},...E},Rt)return;await Z0(...Object.values(E));const Be=o.length>0&&b===0&&s,mt=l.media!==d.media,je=((y=l.media)==null?void 0:y.textTracks)!==((T=d.media)==null?void 0:T.textTracks),we=((g=l.media)==null?void 0:g.videoRenditions)!==((k=d.media)==null?void 0:k.videoRenditions),Pe=((D=l.media)==null?void 0:D.audioTracks)!==((C=d.media)==null?void 0:C.audioTracks),We=(($=l.media)==null?void 0:$.remote)!==((B=d.media)==null?void 0:B.remote),ei=l.documentElement!==d.documentElement,Vi=!!l.media&&(mt||Be),Pc=!!((G=l.media)!=null&&G.textTracks)&&(je||Be),$c=!!((W=l.media)!=null&&W.videoRenditions)&&(we||Be),Uc=!!((U=l.media)!=null&&U.audioTracks)&&(Pe||Be),Hc=!!((Ne=l.media)!=null&&Ne.remote)&&(We||Be),Bc=!!l.documentElement&&(ei||Be),bl=Vi||Pc||$c||Uc||Hc||Bc,_a=o.length===0&&b===1&&s,Wc=!!d.media&&(mt||_a),Fc=!!((ze=d.media)!=null&&ze.textTracks)&&(je||_a),Kc=!!((Qe=d.media)!=null&&Qe.videoRenditions)&&(we||_a),Vc=!!((ve=d.media)!=null&&ve.audioTracks)&&(Pe||_a),qc=!!((He=d.media)!=null&&He.remote)&&(We||_a),Yc=!!d.documentElement&&(ei||_a),Gc=Wc||Fc||Kc||Vc||qc||Yc;if(!(bl||Gc)){Object.entries(d).forEach(([X,Ar])=>{l[X]=Ar}),p(),d=void 0;return}Object.entries(a).forEach(([X,{get:Ar,mediaEvents:Of=[],textTracksEvents:xf=[],videoRenditionsEvents:Nf=[],audioTracksEvents:Pf=[],remoteEvents:$f=[],rootEvents:Uf=[],stateOwnersUpdateHandlers:Hf=[]}])=>{h[X]||(h[X]={});const Ze=le=>{const fe=Ar(l,le);m({[X]:fe})};let Ie;Ie=h[X].mediaEvents,Of.forEach(le=>{Ie&&Vi&&(l.media.removeEventListener(le,Ie),h[X].mediaEvents=void 0),Wc&&(d.media.addEventListener(le,Ze),h[X].mediaEvents=Ze)}),Ie=h[X].textTracksEvents,xf.forEach(le=>{var fe,pt;Ie&&Pc&&((fe=l.media.textTracks)==null||fe.removeEventListener(le,Ie),h[X].textTracksEvents=void 0),Fc&&((pt=d.media.textTracks)==null||pt.addEventListener(le,Ze),h[X].textTracksEvents=Ze)}),Ie=h[X].videoRenditionsEvents,Nf.forEach(le=>{var fe,pt;Ie&&$c&&((fe=l.media.videoRenditions)==null||fe.removeEventListener(le,Ie),h[X].videoRenditionsEvents=void 0),Kc&&((pt=d.media.videoRenditions)==null||pt.addEventListener(le,Ze),h[X].videoRenditionsEvents=Ze)}),Ie=h[X].audioTracksEvents,Pf.forEach(le=>{var fe,pt;Ie&&Uc&&((fe=l.media.audioTracks)==null||fe.removeEventListener(le,Ie),h[X].audioTracksEvents=void 0),Vc&&((pt=d.media.audioTracks)==null||pt.addEventListener(le,Ze),h[X].audioTracksEvents=Ze)}),Ie=h[X].remoteEvents,$f.forEach(le=>{var fe,pt;Ie&&Hc&&((fe=l.media.remote)==null||fe.removeEventListener(le,Ie),h[X].remoteEvents=void 0),qc&&((pt=d.media.remote)==null||pt.addEventListener(le,Ze),h[X].remoteEvents=Ze)}),Ie=h[X].rootEvents,Uf.forEach(le=>{Ie&&Bc&&(l.documentElement.removeEventListener(le,Ie),h[X].rootEvents=void 0),Yc&&(d.documentElement.addEventListener(le,Ze),h[X].rootEvents=Ze)});const Bn=h[X].stateOwnersUpdateHandlers;if(Bn&&bl&&(Array.isArray(Bn)?Bn:[Bn]).forEach(fe=>{typeof fe=="function"&&fe()}),Gc){const le=Hf.map(fe=>fe(Ze,d)).filter(fe=>typeof fe=="function");h[X].stateOwnersUpdateHandlers=le.length===1?le[0]:le}else bl&&(h[X].stateOwnersUpdateHandlers=void 0)}),Object.entries(d).forEach(([X,Ar])=>{l[X]=Ar}),p(),d=void 0};return v({media:t,fullscreenElement:e,documentElement:i,options:n}),{dispatch(E){const{type:b,detail:y}=E;if(r[b]&&u.mediaErrorCode==null){m(r[b](a,l,E));return}b==="mediaelementchangerequest"?v({media:y}):b==="fullscreenelementchangerequest"?v({fullscreenElement:y}):b==="documentelementchangerequest"?v({documentElement:y}):b==="optionschangerequest"&&(Object.entries(y??{}).forEach(([T,g])=>{l.options[T]=g}),p())},getState(){return u},subscribe(E){return v({},o.length+1),o.push(E),E(u),()=>{const b=o.indexOf(E);b>=0&&(v({},o.length-1),o.splice(b,1))}}}};var xu=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},M=(t,e,i)=>(xu(t,e,"read from private field"),i?i.call(t):e.get(t)),at=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},bt=(t,e,i,a)=>(xu(t,e,"write to private field"),e.set(t,i),i),Ir=(t,e,i)=>(xu(t,e,"access private method"),i),ui,Yr,V,zt,Gr,xt,Ts,zr,As,od,ca,ks,ld,dd,Xp;const Jp=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Enter"," ","f","m","k","c","l","j",">","<","p"],Sh=10,wh=.025,Ih=.25,i1=.25,a1=2,S={DEFAULT_SUBTITLES:"defaultsubtitles",DEFAULT_STREAM_TYPE:"defaultstreamtype",DEFAULT_DURATION:"defaultduration",FULLSCREEN_ELEMENT:"fullscreenelement",HOTKEYS:"hotkeys",KEYBOARD_BACKWARD_SEEK_OFFSET:"keyboardbackwardseekoffset",KEYBOARD_FORWARD_SEEK_OFFSET:"keyboardforwardseekoffset",KEYBOARD_DOWN_VOLUME_STEP:"keyboarddownvolumestep",KEYBOARD_UP_VOLUME_STEP:"keyboardupvolumestep",KEYS_USED:"keysused",LANG:"lang",LOOP:"loop",LIVE_EDGE_OFFSET:"liveedgeoffset",NO_AUTO_SEEK_TO_LIVE:"noautoseektolive",NO_DEFAULT_STORE:"nodefaultstore",NO_HOTKEYS:"nohotkeys",NO_MUTED_PREF:"nomutedpref",NO_SUBTITLES_LANG_PREF:"nosubtitleslangpref",NO_VOLUME_PREF:"novolumepref",SEEK_TO_LIVE_OFFSET:"seektoliveoffset"};class ev extends sl{constructor(){super(),at(this,As),at(this,ks),at(this,dd),this.mediaStateReceivers=[],this.associatedElementSubscriptions=new Map,at(this,ui,new Du(this,S.HOTKEYS)),at(this,Yr,void 0),at(this,V,void 0),at(this,zt,null),at(this,Gr,void 0),at(this,xt,void 0),at(this,Ts,i=>{var a;(a=M(this,V))==null||a.dispatch(i)}),at(this,zr,void 0),at(this,ca,i=>{const{key:a,shiftKey:r}=i;if(!(r&&(a==="/"||a==="?")||Jp.includes(a))){this.removeEventListener("keyup",M(this,ca));return}this.keyboardShortcutHandler(i)}),this.associateElement(this);let e={};bt(this,Gr,i=>{Object.entries(i).forEach(([a,r])=>{if(a in e&&e[a]===r)return;this.propagateMediaState(a,r);const n=a.toLowerCase(),s=new _.CustomEvent(a0[n],{composed:!0,detail:r});this.dispatchEvent(s)}),e=i})}static get observedAttributes(){return super.observedAttributes.concat(S.NO_HOTKEYS,S.HOTKEYS,S.DEFAULT_STREAM_TYPE,S.DEFAULT_SUBTITLES,S.DEFAULT_DURATION,S.NO_MUTED_PREF,S.NO_VOLUME_PREF,S.LANG,S.LOOP,S.LIVE_EDGE_OFFSET,S.SEEK_TO_LIVE_OFFSET,S.NO_AUTO_SEEK_TO_LIVE)}get mediaStore(){return M(this,V)}set mediaStore(e){var i,a;if(M(this,V)&&((i=M(this,xt))==null||i.call(this),bt(this,xt,void 0)),bt(this,V,e),!M(this,V)&&!this.hasAttribute(S.NO_DEFAULT_STORE)){Ir(this,As,od).call(this);return}bt(this,xt,(a=M(this,V))==null?void 0:a.subscribe(M(this,Gr)))}get fullscreenElement(){var e;return(e=M(this,Yr))!=null?e:this}set fullscreenElement(e){var i;this.hasAttribute(S.FULLSCREEN_ELEMENT)&&this.removeAttribute(S.FULLSCREEN_ELEMENT),bt(this,Yr,e),(i=M(this,V))==null||i.dispatch({type:"fullscreenelementchangerequest",detail:this.fullscreenElement})}get defaultSubtitles(){return q(this,S.DEFAULT_SUBTITLES)}set defaultSubtitles(e){Y(this,S.DEFAULT_SUBTITLES,e)}get defaultStreamType(){return oe(this,S.DEFAULT_STREAM_TYPE)}set defaultStreamType(e){ae(this,S.DEFAULT_STREAM_TYPE,e)}get defaultDuration(){return ie(this,S.DEFAULT_DURATION)}set defaultDuration(e){ce(this,S.DEFAULT_DURATION,e)}get noHotkeys(){return q(this,S.NO_HOTKEYS)}set noHotkeys(e){Y(this,S.NO_HOTKEYS,e)}get keysUsed(){return oe(this,S.KEYS_USED)}set keysUsed(e){ae(this,S.KEYS_USED,e)}get liveEdgeOffset(){return ie(this,S.LIVE_EDGE_OFFSET)}set liveEdgeOffset(e){ce(this,S.LIVE_EDGE_OFFSET,e)}get noAutoSeekToLive(){return q(this,S.NO_AUTO_SEEK_TO_LIVE)}set noAutoSeekToLive(e){Y(this,S.NO_AUTO_SEEK_TO_LIVE,e)}get noVolumePref(){return q(this,S.NO_VOLUME_PREF)}set noVolumePref(e){Y(this,S.NO_VOLUME_PREF,e)}get noMutedPref(){return q(this,S.NO_MUTED_PREF)}set noMutedPref(e){Y(this,S.NO_MUTED_PREF,e)}get noSubtitlesLangPref(){return q(this,S.NO_SUBTITLES_LANG_PREF)}set noSubtitlesLangPref(e){Y(this,S.NO_SUBTITLES_LANG_PREF,e)}get noDefaultStore(){return q(this,S.NO_DEFAULT_STORE)}set noDefaultStore(e){Y(this,S.NO_DEFAULT_STORE,e)}get resolvedLang(){return E0()}attributeChangedCallback(e,i,a){var r,n,s,o,l,u,m,p,h,d,v,E;if(super.attributeChangedCallback(e,i,a),e===S.NO_HOTKEYS)a!==i&&a===""?(this.hasAttribute(S.HOTKEYS)&&console.warn("Media Chrome: Both `hotkeys` and `nohotkeys` have been set. All hotkeys will be disabled."),this.disableHotkeys()):a!==i&&a===null&&this.enableHotkeys();else if(e===S.HOTKEYS)M(this,ui).value=a;else if(e===S.DEFAULT_SUBTITLES&&a!==i)(r=M(this,V))==null||r.dispatch({type:"optionschangerequest",detail:{defaultSubtitles:this.hasAttribute(S.DEFAULT_SUBTITLES)}});else if(e===S.DEFAULT_STREAM_TYPE)(s=M(this,V))==null||s.dispatch({type:"optionschangerequest",detail:{defaultStreamType:(n=this.getAttribute(S.DEFAULT_STREAM_TYPE))!=null?n:void 0}});else if(e===S.LIVE_EDGE_OFFSET&&a!==i)(o=M(this,V))==null||o.dispatch({type:"optionschangerequest",detail:{liveEdgeOffset:this.hasAttribute(S.LIVE_EDGE_OFFSET)?+this.getAttribute(S.LIVE_EDGE_OFFSET):void 0,seekToLiveOffset:this.hasAttribute(S.SEEK_TO_LIVE_OFFSET)?+this.getAttribute(S.SEEK_TO_LIVE_OFFSET):this.hasAttribute(S.LIVE_EDGE_OFFSET)?+this.getAttribute(S.LIVE_EDGE_OFFSET):void 0}});else if(e===S.SEEK_TO_LIVE_OFFSET&&a!==i)(l=M(this,V))==null||l.dispatch({type:"optionschangerequest",detail:{seekToLiveOffset:this.hasAttribute(S.SEEK_TO_LIVE_OFFSET)?+this.getAttribute(S.SEEK_TO_LIVE_OFFSET):this.hasAttribute(S.LIVE_EDGE_OFFSET)?+this.getAttribute(S.LIVE_EDGE_OFFSET):void 0}});else if(e===S.NO_AUTO_SEEK_TO_LIVE)(u=M(this,V))==null||u.dispatch({type:"optionschangerequest",detail:{noAutoSeekToLive:this.hasAttribute(S.NO_AUTO_SEEK_TO_LIVE)}});else if(e===S.FULLSCREEN_ELEMENT){const b=a?(m=this.getRootNode())==null?void 0:m.getElementById(a):void 0;bt(this,Yr,b),(p=M(this,V))==null||p.dispatch({type:"fullscreenelementchangerequest",detail:this.fullscreenElement})}else e===S.LANG&&a!==i?(v0(a),(h=M(this,V))==null||h.dispatch({type:"optionschangerequest",detail:{mediaLang:a}})):e===S.LOOP&&a!==i?(d=M(this,V))==null||d.dispatch({type:L.MEDIA_LOOP_REQUEST,detail:a!=null}):e===S.NO_VOLUME_PREF&&a!==i?(v=M(this,V))==null||v.dispatch({type:"optionschangerequest",detail:{noVolumePref:this.hasAttribute(S.NO_VOLUME_PREF)}}):e===S.NO_MUTED_PREF&&a!==i&&((E=M(this,V))==null||E.dispatch({type:"optionschangerequest",detail:{noMutedPref:this.hasAttribute(S.NO_MUTED_PREF)}}))}connectedCallback(){var e,i,a;this.associateElement(this),!M(this,V)&&!this.hasAttribute(S.NO_DEFAULT_STORE)&&Ir(this,As,od).call(this),(e=M(this,V))==null||e.dispatch({type:"documentelementchangerequest",detail:ye}),(i=M(this,V))==null||i.dispatch({type:"fullscreenelementchangerequest",detail:this.fullscreenElement}),super.connectedCallback(),M(this,V)&&!M(this,xt)&&bt(this,xt,(a=M(this,V))==null?void 0:a.subscribe(M(this,Gr))),M(this,zr)!==void 0&&M(this,V)&&this.media&&setTimeout(()=>{var r,n,s;(n=(r=this.media)==null?void 0:r.textTracks)!=null&&n.length&&((s=M(this,V))==null||s.dispatch({type:L.MEDIA_TOGGLE_SUBTITLES_REQUEST,detail:M(this,zr)}))},0),this.hasAttribute(S.NO_HOTKEYS)?this.disableHotkeys():this.enableHotkeys()}disconnectedCallback(){var e,i,a,r,n,s;if((e=super.disconnectedCallback)==null||e.call(this),this.disableHotkeys(),M(this,V)){const o=M(this,V).getState();bt(this,zr,!!((i=o.mediaSubtitlesShowing)!=null&&i.length)),(a=M(this,V))==null||a.dispatch({type:"fullscreenelementchangerequest",detail:void 0}),(r=M(this,V))==null||r.dispatch({type:"documentelementchangerequest",detail:void 0}),(n=M(this,V))==null||n.dispatch({type:L.MEDIA_TOGGLE_SUBTITLES_REQUEST,detail:!1})}M(this,xt)&&((s=M(this,xt))==null||s.call(this),bt(this,xt,void 0)),this.unassociateElement(this),M(this,zt)&&(M(this,zt).remove(),bt(this,zt,null))}mediaSetCallback(e){var i;super.mediaSetCallback(e),(i=M(this,V))==null||i.dispatch({type:"mediaelementchangerequest",detail:e}),e.hasAttribute("tabindex")||(e.tabIndex=-1)}mediaUnsetCallback(e){var i;super.mediaUnsetCallback(e),(i=M(this,V))==null||i.dispatch({type:"mediaelementchangerequest",detail:void 0})}propagateMediaState(e,i){Ch(this.mediaStateReceivers,e,i)}associateElement(e){if(!e)return;const{associatedElementSubscriptions:i}=this;if(i.has(e))return;const a=this.registerMediaStateReceiver.bind(this),r=this.unregisterMediaStateReceiver.bind(this),n=d1(e,a,r);Object.values(L).forEach(s=>{e.addEventListener(s,M(this,Ts))}),i.set(e,n)}unassociateElement(e){if(!e)return;const{associatedElementSubscriptions:i}=this;if(!i.has(e))return;i.get(e)(),i.delete(e),Object.values(L).forEach(r=>{e.removeEventListener(r,M(this,Ts))})}registerMediaStateReceiver(e){if(!e)return;const i=this.mediaStateReceivers;i.indexOf(e)>-1||(i.push(e),M(this,V)&&Object.entries(M(this,V).getState()).forEach(([r,n])=>{Ch([e],r,n)}))}unregisterMediaStateReceiver(e){const i=this.mediaStateReceivers,a=i.indexOf(e);a<0||i.splice(a,1)}enableHotkeys(){this.addEventListener("keydown",Ir(this,ks,ld))}disableHotkeys(){this.removeEventListener("keydown",Ir(this,ks,ld)),this.removeEventListener("keyup",M(this,ca))}get hotkeys(){return M(this,ui)}set hotkeys(e){ae(this,S.HOTKEYS,e)}keyboardShortcutHandler(e){var i,a,r,n,s,o,l,u,m;const p=e.target;if(((r=(a=(i=p.getAttribute(S.KEYS_USED))==null?void 0:i.split(" "))!=null?a:p?.keysUsed)!=null?r:[]).map(y=>y==="Space"?" ":y).filter(Boolean).includes(e.key))return;let d,v,E;if(!(M(this,ui).contains(`no${e.key.toLowerCase()}`)||e.key===" "&&M(this,ui).contains("nospace")||e.shiftKey&&(e.key==="/"||e.key==="?")&&M(this,ui).contains("noshift+/")))switch(e.key){case" ":case"k":d=M(this,V).getState().mediaPaused?L.MEDIA_PLAY_REQUEST:L.MEDIA_PAUSE_REQUEST,this.dispatchEvent(new _.CustomEvent(d,{composed:!0,bubbles:!0}));break;case"m":d=this.mediaStore.getState().mediaVolumeLevel==="off"?L.MEDIA_UNMUTE_REQUEST:L.MEDIA_MUTE_REQUEST,this.dispatchEvent(new _.CustomEvent(d,{composed:!0,bubbles:!0}));break;case"f":d=this.mediaStore.getState().mediaIsFullscreen?L.MEDIA_EXIT_FULLSCREEN_REQUEST:L.MEDIA_ENTER_FULLSCREEN_REQUEST,this.dispatchEvent(new _.CustomEvent(d,{composed:!0,bubbles:!0}));break;case"c":this.dispatchEvent(new _.CustomEvent(L.MEDIA_TOGGLE_SUBTITLES_REQUEST,{composed:!0,bubbles:!0}));break;case"ArrowLeft":case"j":{const y=this.hasAttribute(S.KEYBOARD_BACKWARD_SEEK_OFFSET)?+this.getAttribute(S.KEYBOARD_BACKWARD_SEEK_OFFSET):Sh;v=Math.max(((n=this.mediaStore.getState().mediaCurrentTime)!=null?n:0)-y,0),E=new _.CustomEvent(L.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:v}),this.dispatchEvent(E);break}case"ArrowRight":case"l":{const y=this.hasAttribute(S.KEYBOARD_FORWARD_SEEK_OFFSET)?+this.getAttribute(S.KEYBOARD_FORWARD_SEEK_OFFSET):Sh;v=Math.max(((s=this.mediaStore.getState().mediaCurrentTime)!=null?s:0)+y,0),E=new _.CustomEvent(L.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:v}),this.dispatchEvent(E);break}case"ArrowUp":{const y=this.hasAttribute(S.KEYBOARD_UP_VOLUME_STEP)?+this.getAttribute(S.KEYBOARD_UP_VOLUME_STEP):wh;v=Math.min(((o=this.mediaStore.getState().mediaVolume)!=null?o:1)+y,1),E=new _.CustomEvent(L.MEDIA_VOLUME_REQUEST,{composed:!0,bubbles:!0,detail:v}),this.dispatchEvent(E);break}case"ArrowDown":{const y=this.hasAttribute(S.KEYBOARD_DOWN_VOLUME_STEP)?+this.getAttribute(S.KEYBOARD_DOWN_VOLUME_STEP):wh;v=Math.max(((l=this.mediaStore.getState().mediaVolume)!=null?l:1)-y,0),E=new _.CustomEvent(L.MEDIA_VOLUME_REQUEST,{composed:!0,bubbles:!0,detail:v}),this.dispatchEvent(E);break}case"<":{const y=(u=this.mediaStore.getState().mediaPlaybackRate)!=null?u:1;v=Math.max(y-Ih,i1).toFixed(2),E=new _.CustomEvent(L.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:v}),this.dispatchEvent(E);break}case">":{const y=(m=this.mediaStore.getState().mediaPlaybackRate)!=null?m:1;v=Math.min(y+Ih,a1).toFixed(2),E=new _.CustomEvent(L.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:v}),this.dispatchEvent(E);break}case"/":case"?":{e.shiftKey&&Ir(this,dd,Xp).call(this);break}case"p":{d=this.mediaStore.getState().mediaIsPip?L.MEDIA_EXIT_PIP_REQUEST:L.MEDIA_ENTER_PIP_REQUEST,E=new _.CustomEvent(d,{composed:!0,bubbles:!0}),this.dispatchEvent(E);break}}}}ui=new WeakMap;Yr=new WeakMap;V=new WeakMap;zt=new WeakMap;Gr=new WeakMap;xt=new WeakMap;Ts=new WeakMap;zr=new WeakMap;As=new WeakSet;od=function(){var t;this.mediaStore=t1({media:this.media,fullscreenElement:this.fullscreenElement,options:{defaultSubtitles:this.hasAttribute(S.DEFAULT_SUBTITLES),defaultDuration:this.hasAttribute(S.DEFAULT_DURATION)?+this.getAttribute(S.DEFAULT_DURATION):void 0,defaultStreamType:(t=this.getAttribute(S.DEFAULT_STREAM_TYPE))!=null?t:void 0,liveEdgeOffset:this.hasAttribute(S.LIVE_EDGE_OFFSET)?+this.getAttribute(S.LIVE_EDGE_OFFSET):void 0,seekToLiveOffset:this.hasAttribute(S.SEEK_TO_LIVE_OFFSET)?+this.getAttribute(S.SEEK_TO_LIVE_OFFSET):this.hasAttribute(S.LIVE_EDGE_OFFSET)?+this.getAttribute(S.LIVE_EDGE_OFFSET):void 0,noAutoSeekToLive:this.hasAttribute(S.NO_AUTO_SEEK_TO_LIVE),noVolumePref:this.hasAttribute(S.NO_VOLUME_PREF),noMutedPref:this.hasAttribute(S.NO_MUTED_PREF),noSubtitlesLangPref:this.hasAttribute(S.NO_SUBTITLES_LANG_PREF)}})};ca=new WeakMap;ks=new WeakSet;ld=function(t){var e;const{metaKey:i,altKey:a,key:r,shiftKey:n}=t,s=n&&(r==="/"||r==="?");if(s&&((e=M(this,zt))!=null&&e.open)){this.removeEventListener("keyup",M(this,ca));return}if(i||a||!s&&!Jp.includes(r)){this.removeEventListener("keyup",M(this,ca));return}const o=t.target,l=o instanceof HTMLElement&&(o.tagName.toLowerCase()==="media-volume-range"||o.tagName.toLowerCase()==="media-time-range");[" ","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(r)&&!(M(this,ui).contains(`no${r.toLowerCase()}`)||r===" "&&M(this,ui).contains("nospace"))&&!l&&t.preventDefault(),this.addEventListener("keyup",M(this,ca),{once:!0})};dd=new WeakSet;Xp=function(){M(this,zt)||(bt(this,zt,ye.createElement("media-keyboard-shortcuts-dialog")),this.appendChild(M(this,zt))),M(this,zt).open=!0};const r1=Object.values(c),n1=Object.values(wp),tv=t=>{var e,i,a,r;let{observedAttributes:n}=t.constructor;!n&&((e=t.nodeName)!=null&&e.includes("-"))&&(_.customElements.upgrade(t),{observedAttributes:n}=t.constructor);const s=(r=(a=(i=t?.getAttribute)==null?void 0:i.call(t,Q.MEDIA_CHROME_ATTRIBUTES))==null?void 0:a.split)==null?void 0:r.call(a,/\s+/);return Array.isArray(n||s)?(n||s).filter(o=>r1.includes(o)):[]},s1=t=>{var e,i;return(e=t.nodeName)!=null&&e.includes("-")&&_.customElements.get((i=t.nodeName)==null?void 0:i.toLowerCase())&&!(t instanceof _.customElements.get(t.nodeName.toLowerCase()))&&_.customElements.upgrade(t),n1.some(a=>a in t)},ud=t=>s1(t)||!!tv(t).length,Rh=t=>{var e;return(e=t?.join)==null?void 0:e.call(t,":")},Lh={[c.MEDIA_SUBTITLES_LIST]:Cn,[c.MEDIA_SUBTITLES_SHOWING]:Cn,[c.MEDIA_SEEKABLE]:Rh,[c.MEDIA_BUFFERED]:t=>t?.map(Rh).join(" "),[c.MEDIA_PREVIEW_COORDS]:t=>t?.join(" "),[c.MEDIA_RENDITION_LIST]:n0,[c.MEDIA_AUDIO_TRACK_LIST]:d0},o1=async(t,e,i)=>{var a,r;if(t.isConnected||await Lp(0),typeof i=="boolean"||i==null)return Y(t,e,i);if(typeof i=="number")return ce(t,e,i);if(typeof i=="string")return ae(t,e,i);if(Array.isArray(i)&&!i.length)return t.removeAttribute(e);const n=(r=(a=Lh[e])==null?void 0:a.call(Lh,i))!=null?r:i;return t.setAttribute(e,n)},l1=t=>{var e;return!!((e=t.closest)!=null&&e.call(t,'*[slot="media"]'))},Xi=(t,e)=>{if(l1(t))return;const i=(r,n)=>{var s,o;ud(r)&&n(r);const{children:l=[]}=r??{},u=(o=(s=r?.shadowRoot)==null?void 0:s.children)!=null?o:[];[...l,...u].forEach(p=>Xi(p,n))},a=t?.nodeName.toLowerCase();if(a.includes("-")&&!ud(t)){_.customElements.whenDefined(a).then(()=>{i(t,e)});return}i(t,e)},Ch=(t,e,i)=>{t.forEach(a=>{if(e in a){a[e]=i;return}const r=tv(a),n=e.toLowerCase();r.includes(n)&&o1(a,n,i)})},d1=(t,e,i)=>{Xi(t,e);const a=m=>{var p;const h=(p=m?.composedPath()[0])!=null?p:m.target;e(h)},r=m=>{var p;const h=(p=m?.composedPath()[0])!=null?p:m.target;i(h)};t.addEventListener(L.REGISTER_MEDIA_STATE_RECEIVER,a),t.addEventListener(L.UNREGISTER_MEDIA_STATE_RECEIVER,r);const n=m=>{m.forEach(p=>{const{addedNodes:h=[],removedNodes:d=[],type:v,target:E,attributeName:b}=p;v==="childList"?(Array.prototype.forEach.call(h,y=>Xi(y,e)),Array.prototype.forEach.call(d,y=>Xi(y,i))):v==="attributes"&&b===Q.MEDIA_CHROME_ATTRIBUTES&&(ud(E)?e(E):i(E))})};let s=[];const o=m=>{const p=m.target;p.name!=="media"&&(s.forEach(h=>Xi(h,i)),s=[...p.assignedElements({flatten:!0})],s.forEach(h=>Xi(h,e)))};t.addEventListener("slotchange",o);const l=new MutationObserver(n);return l.observe(t,{childList:!0,attributes:!0,subtree:!0}),()=>{Xi(t,i),t.removeEventListener("slotchange",o),l.disconnect(),t.removeEventListener(L.REGISTER_MEDIA_STATE_RECEIVER,a),t.removeEventListener(L.UNREGISTER_MEDIA_STATE_RECEIVER,r)}};_.customElements.get("media-controller")||_.customElements.define("media-controller",ev);var u1=ev;const ba={PLACEMENT:"placement",BOUNDS:"bounds"};function c1(t){return`
    <style>
      :host {
        --_tooltip-background-color: var(--media-tooltip-background-color, var(--media-secondary-color, rgba(20, 20, 30, .7)));
        --_tooltip-background: var(--media-tooltip-background, var(--_tooltip-background-color));
        --_tooltip-arrow-half-width: calc(var(--media-tooltip-arrow-width, 12px) / 2);
        --_tooltip-arrow-height: var(--media-tooltip-arrow-height, 5px);
        --_tooltip-arrow-background: var(--media-tooltip-arrow-color, var(--_tooltip-background-color));
        position: relative;
        pointer-events: none;
        display: var(--media-tooltip-display, inline-flex);
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        z-index: var(--media-tooltip-z-index, 1);
        background: var(--_tooltip-background);
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        font: var(--media-font,
          var(--media-font-weight, 400)
          var(--media-font-size, 13px) /
          var(--media-text-content-height, var(--media-control-height, 18px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        padding: var(--media-tooltip-padding, .35em .7em);
        border: var(--media-tooltip-border, none);
        border-radius: var(--media-tooltip-border-radius, 5px);
        filter: var(--media-tooltip-filter, drop-shadow(0 0 4px rgba(0, 0, 0, .2)));
        white-space: var(--media-tooltip-white-space, nowrap);
      }

      :host([hidden]) {
        display: none;
      }

      img, svg {
        display: inline-block;
      }

      #arrow {
        position: absolute;
        width: 0px;
        height: 0px;
        border-style: solid;
        display: var(--media-tooltip-arrow-display, block);
      }

      :host(:not([placement])),
      :host([placement="top"]) {
        position: absolute;
        bottom: calc(100% + var(--media-tooltip-distance, 12px));
        left: 50%;
        transform: translate(calc(-50% - var(--media-tooltip-offset-x, 0px)), 0);
      }
      :host(:not([placement])) #arrow,
      :host([placement="top"]) #arrow {
        top: 100%;
        left: 50%;
        border-width: var(--_tooltip-arrow-height) var(--_tooltip-arrow-half-width) 0 var(--_tooltip-arrow-half-width);
        border-color: var(--_tooltip-arrow-background) transparent transparent transparent;
        transform: translate(calc(-50% + var(--media-tooltip-offset-x, 0px)), 0);
      }

      :host([placement="right"]) {
        position: absolute;
        left: calc(100% + var(--media-tooltip-distance, 12px));
        top: 50%;
        transform: translate(0, -50%);
      }
      :host([placement="right"]) #arrow {
        top: 50%;
        right: 100%;
        border-width: var(--_tooltip-arrow-half-width) var(--_tooltip-arrow-height) var(--_tooltip-arrow-half-width) 0;
        border-color: transparent var(--_tooltip-arrow-background) transparent transparent;
        transform: translate(0, -50%);
      }

      :host([placement="bottom"]) {
        position: absolute;
        top: calc(100% + var(--media-tooltip-distance, 12px));
        left: 50%;
        transform: translate(calc(-50% - var(--media-tooltip-offset-x, 0px)), 0);
      }
      :host([placement="bottom"]) #arrow {
        bottom: 100%;
        left: 50%;
        border-width: 0 var(--_tooltip-arrow-half-width) var(--_tooltip-arrow-height) var(--_tooltip-arrow-half-width);
        border-color: transparent transparent var(--_tooltip-arrow-background) transparent;
        transform: translate(calc(-50% + var(--media-tooltip-offset-x, 0px)), 0);
      }

      :host([placement="left"]) {
        position: absolute;
        right: calc(100% + var(--media-tooltip-distance, 12px));
        top: 50%;
        transform: translate(0, -50%);
      }
      :host([placement="left"]) #arrow {
        top: 50%;
        left: 100%;
        border-width: var(--_tooltip-arrow-half-width) 0 var(--_tooltip-arrow-half-width) var(--_tooltip-arrow-height);
        border-color: transparent transparent transparent var(--_tooltip-arrow-background);
        transform: translate(0, -50%);
      }
      
      :host([placement="none"]) #arrow {
        display: none;
      }
    </style>
    <slot></slot>
    <div id="arrow"></div>
  `}class dl extends _.HTMLElement{constructor(){if(super(),this.updateXOffset=()=>{var e;if(!Up(this,{checkOpacity:!1,checkVisibilityCSS:!1}))return;const i=this.placement;if(i==="left"||i==="right"){this.style.removeProperty("--media-tooltip-offset-x");return}const a=getComputedStyle(this),r=(e=_r(this,"#"+this.bounds))!=null?e:Ye(this);if(!r)return;const{x:n,width:s}=r.getBoundingClientRect(),{x:o,width:l}=this.getBoundingClientRect(),u=o+l,m=n+s,p=a.getPropertyValue("--media-tooltip-offset-x"),h=p?parseFloat(p.replace("px","")):0,d=a.getPropertyValue("--media-tooltip-container-margin"),v=d?parseFloat(d.replace("px","")):0,E=o-n+h-v,b=u-m+h+v;if(E<0){this.style.setProperty("--media-tooltip-offset-x",`${E}px`);return}if(b>0){this.style.setProperty("--media-tooltip-offset-x",`${b}px`);return}this.style.removeProperty("--media-tooltip-offset-x")},!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}if(this.arrowEl=this.shadowRoot.querySelector("#arrow"),Object.prototype.hasOwnProperty.call(this,"placement")){const e=this.placement;delete this.placement,this.placement=e}}static get observedAttributes(){return[ba.PLACEMENT,ba.BOUNDS]}get placement(){return oe(this,ba.PLACEMENT)}set placement(e){ae(this,ba.PLACEMENT,e)}get bounds(){return oe(this,ba.BOUNDS)}set bounds(e){ae(this,ba.BOUNDS,e)}}dl.shadowRootOptions={mode:"open"};dl.getTemplateHTML=c1;_.customElements.get("media-tooltip")||_.customElements.define("media-tooltip",dl);var Dh=dl,Nu=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},be=(t,e,i)=>(Nu(t,e,"read from private field"),i?i.call(t):e.get(t)),ga=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Gn=(t,e,i,a)=>(Nu(t,e,"write to private field"),e.set(t,i),i),h1=(t,e,i)=>(Nu(t,e,"access private method"),i),Nt,Za,Ni,Da,Ss,cd,iv;const bi={TOOLTIP_PLACEMENT:"tooltipplacement",DISABLED:"disabled",NO_TOOLTIP:"notooltip"};function m1(t,e={}){return`
    <style>
      :host {
        position: relative;
        font: var(--media-font,
          var(--media-font-weight, bold)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        padding: var(--media-button-padding, var(--media-control-padding, 10px));
        justify-content: var(--media-button-justify-content, center);
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        box-sizing: border-box;
        transition: background .15s linear;
        pointer-events: auto;
        cursor: var(--media-cursor, pointer);
        -webkit-tap-highlight-color: transparent;
      }

      
      :host(:focus-visible) {
        box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        outline: 0;
      }
      
      :host(:where(:focus)) {
        box-shadow: none;
        outline: 0;
      }

      :host(:hover) {
        background: var(--media-control-hover-background, rgba(50 50 70 / .7));
      }

      slot[name="icon"] {
        display: inline-flex;
        align-items: center;
      }

      svg, img, ::slotted(svg), ::slotted(img) {
        width: var(--media-button-icon-width);
        height: var(--media-button-icon-height, var(--media-control-height, 24px));
        transform: var(--media-button-icon-transform);
        transition: var(--media-button-icon-transition);
        fill: var(--media-icon-color, var(--media-primary-color, rgb(238 238 238)));
        vertical-align: middle;
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
      }

      media-tooltip {
        
        max-width: 0;
        overflow-x: clip;
        opacity: 0;
        transition: opacity .3s, max-width 0s 9s;
      }

      :host(:hover) media-tooltip,
      :host(:focus-visible) media-tooltip {
        max-width: 100vw;
        opacity: 1;
        transition: opacity .3s;
      }

      :host([notooltip]) slot[name="tooltip"] {
        display: none;
      }
    </style>

    ${this.getSlotTemplateHTML(t,e)}

    <slot name="tooltip">
      <media-tooltip part="tooltip" aria-hidden="true">
        <template shadowrootmode="${Dh.shadowRootOptions.mode}">
          ${Dh.getTemplateHTML({})}
        </template>
        <slot name="tooltip-content">
          ${this.getTooltipContentHTML(t)}
        </slot>
      </media-tooltip>
    </slot>
  `}function p1(t,e){return`
    <slot></slot>
  `}function v1(){return""}class De extends _.HTMLElement{constructor(){if(super(),ga(this,cd),ga(this,Nt,void 0),this.preventClick=!1,this.tooltipEl=null,ga(this,Za,e=>{this.preventClick||this.handleClick(e),setTimeout(be(this,Ni),0)}),ga(this,Ni,()=>{var e,i;(i=(e=this.tooltipEl)==null?void 0:e.updateXOffset)==null||i.call(e)}),ga(this,Da,e=>{const{key:i}=e;if(!this.keysUsed.includes(i)){this.removeEventListener("keyup",be(this,Da));return}this.preventClick||this.handleClick(e)}),ga(this,Ss,e=>{const{metaKey:i,altKey:a,key:r}=e;if(i||a||!this.keysUsed.includes(r)){this.removeEventListener("keyup",be(this,Da));return}this.addEventListener("keyup",be(this,Da),{once:!0})}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes),i=this.constructor.getTemplateHTML(e);this.shadowRoot.setHTMLUnsafe?this.shadowRoot.setHTMLUnsafe(i):this.shadowRoot.innerHTML=i}this.tooltipEl=this.shadowRoot.querySelector("media-tooltip")}static get observedAttributes(){return["disabled",bi.TOOLTIP_PLACEMENT,Q.MEDIA_CONTROLLER,c.MEDIA_LANG]}enable(){this.addEventListener("click",be(this,Za)),this.addEventListener("keydown",be(this,Ss)),this.tabIndex=0}disable(){this.removeEventListener("click",be(this,Za)),this.removeEventListener("keydown",be(this,Ss)),this.removeEventListener("keyup",be(this,Da)),this.tabIndex=-1}attributeChangedCallback(e,i,a){var r,n,s,o,l;e===Q.MEDIA_CONTROLLER?(i&&((n=(r=be(this,Nt))==null?void 0:r.unassociateElement)==null||n.call(r,this),Gn(this,Nt,null)),a&&this.isConnected&&(Gn(this,Nt,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=be(this,Nt))==null?void 0:o.associateElement)==null||l.call(o,this))):e==="disabled"&&a!==i?a==null?this.enable():this.disable():e===bi.TOOLTIP_PLACEMENT&&this.tooltipEl&&a!==i?this.tooltipEl.placement=a:e===c.MEDIA_LANG&&(this.shadowRoot.querySelector('slot[name="tooltip-content"]').innerHTML=this.constructor.getTooltipContentHTML()),be(this,Ni).call(this)}connectedCallback(){var e,i,a;const{style:r}=ke(this.shadowRoot,":host");r.setProperty("display",`var(--media-control-display, var(--${this.localName}-display, inline-flex))`),this.hasAttribute("disabled")?this.disable():this.enable(),this.setAttribute("role","button");const n=this.getAttribute(Q.MEDIA_CONTROLLER);n&&(Gn(this,Nt,(e=this.getRootNode())==null?void 0:e.getElementById(n)),(a=(i=be(this,Nt))==null?void 0:i.associateElement)==null||a.call(i,this)),_.customElements.whenDefined("media-tooltip").then(()=>h1(this,cd,iv).call(this))}disconnectedCallback(){var e,i;this.disable(),(i=(e=be(this,Nt))==null?void 0:e.unassociateElement)==null||i.call(e,this),Gn(this,Nt,null),this.removeEventListener("mouseenter",be(this,Ni)),this.removeEventListener("focus",be(this,Ni)),this.removeEventListener("click",be(this,Za))}get keysUsed(){return["Enter"," "]}get tooltipPlacement(){return oe(this,bi.TOOLTIP_PLACEMENT)}set tooltipPlacement(e){ae(this,bi.TOOLTIP_PLACEMENT,e)}get mediaController(){return oe(this,Q.MEDIA_CONTROLLER)}set mediaController(e){ae(this,Q.MEDIA_CONTROLLER,e)}get disabled(){return q(this,bi.DISABLED)}set disabled(e){Y(this,bi.DISABLED,e)}get noTooltip(){return q(this,bi.NO_TOOLTIP)}set noTooltip(e){Y(this,bi.NO_TOOLTIP,e)}handleClick(e){}}Nt=new WeakMap;Za=new WeakMap;Ni=new WeakMap;Da=new WeakMap;Ss=new WeakMap;cd=new WeakSet;iv=function(){this.addEventListener("mouseenter",be(this,Ni)),this.addEventListener("focus",be(this,Ni)),this.addEventListener("click",be(this,Za));const t=this.tooltipPlacement;t&&this.tooltipEl&&(this.tooltipEl.placement=t)};De.shadowRootOptions={mode:"open"};De.getTemplateHTML=m1;De.getSlotTemplateHTML=p1;De.getTooltipContentHTML=v1;_.customElements.get("media-chrome-button")||_.customElements.define("media-chrome-button",De);const Mh=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M22.13 3H3.87a.87.87 0 0 0-.87.87v13.26a.87.87 0 0 0 .87.87h3.4L9 16H5V5h16v11h-4l1.72 2h3.4a.87.87 0 0 0 .87-.87V3.87a.87.87 0 0 0-.86-.87Zm-8.75 11.44a.5.5 0 0 0-.76 0l-4.91 5.73a.5.5 0 0 0 .38.83h9.82a.501.501 0 0 0 .38-.83l-4.91-5.73Z"/>
</svg>
`;function f1(t){return`
    <style>
      :host([${c.MEDIA_IS_AIRPLAYING}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      
      :host(:not([${c.MEDIA_IS_AIRPLAYING}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${c.MEDIA_IS_AIRPLAYING}]) slot[name=tooltip-enter],
      :host(:not([${c.MEDIA_IS_AIRPLAYING}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${Mh}</slot>
      <slot name="exit">${Mh}</slot>
    </slot>
  `}function E1(){return`
    <slot name="tooltip-enter">${R("start airplay")}</slot>
    <slot name="tooltip-exit">${R("stop airplay")}</slot>
  `}const Oh=t=>{const e=t.mediaIsAirplaying?R("stop airplay"):R("start airplay");t.setAttribute("aria-label",e)};class Pu extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_IS_AIRPLAYING,c.MEDIA_AIRPLAY_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),Oh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_IS_AIRPLAYING&&Oh(this)}get mediaIsAirplaying(){return q(this,c.MEDIA_IS_AIRPLAYING)}set mediaIsAirplaying(e){Y(this,c.MEDIA_IS_AIRPLAYING,e)}get mediaAirplayUnavailable(){return oe(this,c.MEDIA_AIRPLAY_UNAVAILABLE)}set mediaAirplayUnavailable(e){ae(this,c.MEDIA_AIRPLAY_UNAVAILABLE,e)}handleClick(){const e=new _.CustomEvent(L.MEDIA_AIRPLAY_REQUEST,{composed:!0,bubbles:!0});this.dispatchEvent(e)}}Pu.getSlotTemplateHTML=f1;Pu.getTooltipContentHTML=E1;_.customElements.get("media-airplay-button")||_.customElements.define("media-airplay-button",Pu);const _1=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M22.83 5.68a2.58 2.58 0 0 0-2.3-2.5c-3.62-.24-11.44-.24-15.06 0a2.58 2.58 0 0 0-2.3 2.5c-.23 4.21-.23 8.43 0 12.64a2.58 2.58 0 0 0 2.3 2.5c3.62.24 11.44.24 15.06 0a2.58 2.58 0 0 0 2.3-2.5c.23-4.21.23-8.43 0-12.64Zm-11.39 9.45a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.92 3.92 0 0 1 .92-2.77 3.18 3.18 0 0 1 2.43-1 2.94 2.94 0 0 1 2.13.78c.364.359.62.813.74 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.17 1.61 1.61 0 0 0-1.29.58 2.79 2.79 0 0 0-.5 1.89 3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.48 1.48 0 0 0 1-.37 2.1 2.1 0 0 0 .59-1.14l1.4.44a3.23 3.23 0 0 1-1.07 1.69Zm7.22 0a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.88 3.88 0 0 1 .93-2.77 3.14 3.14 0 0 1 2.42-1 3 3 0 0 1 2.16.82 2.8 2.8 0 0 1 .73 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.21 1.61 1.61 0 0 0-1.29.58A2.79 2.79 0 0 0 15 12a3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.44 1.44 0 0 0 1-.37 2.1 2.1 0 0 0 .6-1.15l1.4.44a3.17 3.17 0 0 1-1.1 1.7Z"/>
</svg>`,b1=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M17.73 14.09a1.4 1.4 0 0 1-1 .37 1.579 1.579 0 0 1-1.27-.58A3 3 0 0 1 15 12a2.8 2.8 0 0 1 .5-1.85 1.63 1.63 0 0 1 1.29-.57 1.47 1.47 0 0 1 1.51 1.2l1.43-.34A2.89 2.89 0 0 0 19 9.07a3 3 0 0 0-2.14-.78 3.14 3.14 0 0 0-2.42 1 3.91 3.91 0 0 0-.93 2.78 3.74 3.74 0 0 0 .92 2.66 3.07 3.07 0 0 0 2.34 1 3.07 3.07 0 0 0 1.91-.57 3.17 3.17 0 0 0 1.07-1.74l-1.4-.45c-.083.43-.3.822-.62 1.12Zm-7.22 0a1.43 1.43 0 0 1-1 .37 1.58 1.58 0 0 1-1.27-.58A3 3 0 0 1 7.76 12a2.8 2.8 0 0 1 .5-1.85 1.63 1.63 0 0 1 1.29-.57 1.47 1.47 0 0 1 1.51 1.2l1.43-.34a2.81 2.81 0 0 0-.74-1.32 2.94 2.94 0 0 0-2.13-.78 3.18 3.18 0 0 0-2.43 1 4 4 0 0 0-.92 2.78 3.74 3.74 0 0 0 .92 2.66 3.07 3.07 0 0 0 2.34 1 3.07 3.07 0 0 0 1.91-.57 3.23 3.23 0 0 0 1.07-1.74l-1.4-.45a2.06 2.06 0 0 1-.6 1.07Zm12.32-8.41a2.59 2.59 0 0 0-2.3-2.51C18.72 3.05 15.86 3 13 3c-2.86 0-5.72.05-7.53.17a2.59 2.59 0 0 0-2.3 2.51c-.23 4.207-.23 8.423 0 12.63a2.57 2.57 0 0 0 2.3 2.5c1.81.13 4.67.19 7.53.19 2.86 0 5.72-.06 7.53-.19a2.57 2.57 0 0 0 2.3-2.5c.23-4.207.23-8.423 0-12.63Zm-1.49 12.53a1.11 1.11 0 0 1-.91 1.11c-1.67.11-4.45.18-7.43.18-2.98 0-5.76-.07-7.43-.18a1.11 1.11 0 0 1-.91-1.11c-.21-4.14-.21-8.29 0-12.43a1.11 1.11 0 0 1 .91-1.11C7.24 4.56 10 4.49 13 4.49s5.76.07 7.43.18a1.11 1.11 0 0 1 .91 1.11c.21 4.14.21 8.29 0 12.43Z"/>
</svg>`;function g1(t){return`
    <style>
      :host([aria-checked="true"]) slot[name=off] {
        display: none !important;
      }

      
      :host(:not([aria-checked="true"])) slot[name=on] {
        display: none !important;
      }

      :host([aria-checked="true"]) slot[name=tooltip-enable],
      :host(:not([aria-checked="true"])) slot[name=tooltip-disable] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="on">${_1}</slot>
      <slot name="off">${b1}</slot>
    </slot>
  `}function y1(){return`
    <slot name="tooltip-enable">${R("Enable captions")}</slot>
    <slot name="tooltip-disable">${R("Disable captions")}</slot>
  `}const xh=t=>{t.setAttribute("aria-checked",Gp(t).toString())};class $u extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_SUBTITLES_LIST,c.MEDIA_SUBTITLES_SHOWING]}connectedCallback(){super.connectedCallback(),this.setAttribute("role","button"),this.setAttribute("aria-label",R("closed captions")),xh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_SUBTITLES_SHOWING&&xh(this)}get mediaSubtitlesList(){return Nh(this,c.MEDIA_SUBTITLES_LIST)}set mediaSubtitlesList(e){Ph(this,c.MEDIA_SUBTITLES_LIST,e)}get mediaSubtitlesShowing(){return Nh(this,c.MEDIA_SUBTITLES_SHOWING)}set mediaSubtitlesShowing(e){Ph(this,c.MEDIA_SUBTITLES_SHOWING,e)}handleClick(){this.dispatchEvent(new _.CustomEvent(L.MEDIA_TOGGLE_SUBTITLES_REQUEST,{composed:!0,bubbles:!0}))}}$u.getSlotTemplateHTML=g1;$u.getTooltipContentHTML=y1;const Nh=(t,e)=>{const i=t.getAttribute(e);return i?ol(i):[]},Ph=(t,e,i)=>{if(!i?.length){t.removeAttribute(e);return}const a=Cn(i);t.getAttribute(e)!==a&&t.setAttribute(e,a)};_.customElements.get("media-captions-button")||_.customElements.define("media-captions-button",$u);const T1='<svg aria-hidden="true" viewBox="0 0 24 24"><g><path class="cast_caf_icon_arch0" d="M1,18 L1,21 L4,21 C4,19.3 2.66,18 1,18 L1,18 Z"/><path class="cast_caf_icon_arch1" d="M1,14 L1,16 C3.76,16 6,18.2 6,21 L8,21 C8,17.13 4.87,14 1,14 L1,14 Z"/><path class="cast_caf_icon_arch2" d="M1,10 L1,12 C5.97,12 10,16.0 10,21 L12,21 C12,14.92 7.07,10 1,10 L1,10 Z"/><path class="cast_caf_icon_box" d="M21,3 L3,3 C1.9,3 1,3.9 1,5 L1,8 L3,8 L3,5 L21,5 L21,19 L14,19 L14,21 L21,21 C22.1,21 23,20.1 23,19 L23,5 C23,3.9 22.1,3 21,3 L21,3 Z"/></g></svg>',A1='<svg aria-hidden="true" viewBox="0 0 24 24"><g><path class="cast_caf_icon_arch0" d="M1,18 L1,21 L4,21 C4,19.3 2.66,18 1,18 L1,18 Z"/><path class="cast_caf_icon_arch1" d="M1,14 L1,16 C3.76,16 6,18.2 6,21 L8,21 C8,17.13 4.87,14 1,14 L1,14 Z"/><path class="cast_caf_icon_arch2" d="M1,10 L1,12 C5.97,12 10,16.0 10,21 L12,21 C12,14.92 7.07,10 1,10 L1,10 Z"/><path class="cast_caf_icon_box" d="M21,3 L3,3 C1.9,3 1,3.9 1,5 L1,8 L3,8 L3,5 L21,5 L21,19 L14,19 L14,21 L21,21 C22.1,21 23,20.1 23,19 L23,5 C23,3.9 22.1,3 21,3 L21,3 Z"/><path class="cast_caf_icon_boxfill" d="M5,7 L5,8.63 C8,8.6 13.37,14 13.37,17 L19,17 L19,7 Z"/></g></svg>';function k1(t){return`
    <style>
      :host([${c.MEDIA_IS_CASTING}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      
      :host(:not([${c.MEDIA_IS_CASTING}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${c.MEDIA_IS_CASTING}]) slot[name=tooltip-enter],
      :host(:not([${c.MEDIA_IS_CASTING}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${T1}</slot>
      <slot name="exit">${A1}</slot>
    </slot>
  `}function S1(){return`
    <slot name="tooltip-enter">${R("Start casting")}</slot>
    <slot name="tooltip-exit">${R("Stop casting")}</slot>
  `}const $h=t=>{const e=t.mediaIsCasting?R("stop casting"):R("start casting");t.setAttribute("aria-label",e)};class Uu extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_IS_CASTING,c.MEDIA_CAST_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),$h(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_IS_CASTING&&$h(this)}get mediaIsCasting(){return q(this,c.MEDIA_IS_CASTING)}set mediaIsCasting(e){Y(this,c.MEDIA_IS_CASTING,e)}get mediaCastUnavailable(){return oe(this,c.MEDIA_CAST_UNAVAILABLE)}set mediaCastUnavailable(e){ae(this,c.MEDIA_CAST_UNAVAILABLE,e)}handleClick(){const e=this.mediaIsCasting?L.MEDIA_EXIT_CAST_REQUEST:L.MEDIA_ENTER_CAST_REQUEST;this.dispatchEvent(new _.CustomEvent(e,{composed:!0,bubbles:!0}))}}Uu.getSlotTemplateHTML=k1;Uu.getTooltipContentHTML=S1;_.customElements.get("media-cast-button")||_.customElements.define("media-cast-button",Uu);var Hu=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},ha=(t,e,i)=>(Hu(t,e,"read from private field"),e.get(t)),ii=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Bu=(t,e,i,a)=>(Hu(t,e,"write to private field"),e.set(t,i),i),Gi=(t,e,i)=>(Hu(t,e,"access private method"),i),Ro,Dn,va,ws,hd,md,av,pd,rv,vd,nv,fd,sv,Ed,ov;function w1(t){return`
    <style>
      :host {
        font: var(--media-font,
          var(--media-font-weight, normal)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        display: var(--media-dialog-display, inline-flex);
        justify-content: center;
        align-items: center;
        
        transition-behavior: allow-discrete;
        visibility: hidden;
        opacity: 0;
        transform: translateY(2px) scale(.99);
        pointer-events: none;
      }

      :host([open]) {
        transition: display .2s, visibility 0s, opacity .2s ease-out, transform .15s ease-out;
        visibility: visible;
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      #content {
        display: flex;
        position: relative;
        box-sizing: border-box;
        width: min(320px, 100%);
        word-wrap: break-word;
        max-height: 100%;
        overflow: auto;
        text-align: center;
        line-height: 1.4;
      }
    </style>
    ${this.getSlotTemplateHTML(t)}
  `}function I1(t){return`
    <slot id="content"></slot>
  `}const Rr={OPEN:"open",ANCHOR:"anchor"};class br extends _.HTMLElement{constructor(){super(),ii(this,ws),ii(this,md),ii(this,pd),ii(this,vd),ii(this,fd),ii(this,Ed),ii(this,Ro,!1),ii(this,Dn,null),ii(this,va,null)}static get observedAttributes(){return[Rr.OPEN,Rr.ANCHOR]}get open(){return q(this,Rr.OPEN)}set open(e){Y(this,Rr.OPEN,e)}handleEvent(e){switch(e.type){case"invoke":Gi(this,vd,nv).call(this,e);break;case"focusout":Gi(this,fd,sv).call(this,e);break;case"keydown":Gi(this,Ed,ov).call(this,e);break}}connectedCallback(){Gi(this,ws,hd).call(this),this.role||(this.role="dialog"),this.addEventListener("invoke",this),this.addEventListener("focusout",this),this.addEventListener("keydown",this)}disconnectedCallback(){this.removeEventListener("invoke",this),this.removeEventListener("focusout",this),this.removeEventListener("keydown",this)}attributeChangedCallback(e,i,a){Gi(this,ws,hd).call(this),e===Rr.OPEN&&a!==i&&(this.open?Gi(this,md,av).call(this):Gi(this,pd,rv).call(this))}focus(){Bu(this,Dn,Iu());const e=!this.dispatchEvent(new Event("focus",{composed:!0,cancelable:!0})),i=!this.dispatchEvent(new Event("focusin",{composed:!0,bubbles:!0,cancelable:!0}));if(e||i)return;const a=this.querySelector('[autofocus], [tabindex]:not([tabindex="-1"]), [role="menu"]');a?.focus()}get keysUsed(){return["Escape","Tab"]}}Ro=new WeakMap;Dn=new WeakMap;va=new WeakMap;ws=new WeakSet;hd=function(){if(!ha(this,Ro)&&(Bu(this,Ro,!0),!this.shadowRoot)){this.attachShadow(this.constructor.shadowRootOptions);const t=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(t),queueMicrotask(()=>{const{style:e}=ke(this.shadowRoot,":host");e.setProperty("transition","display .15s, visibility .15s, opacity .15s ease-in, transform .15s ease-in")})}};md=new WeakSet;av=function(){var t;(t=ha(this,va))==null||t.setAttribute("aria-expanded","true"),this.dispatchEvent(new Event("open",{composed:!0,bubbles:!0})),this.addEventListener("transitionend",()=>this.focus(),{once:!0})};pd=new WeakSet;rv=function(){var t;(t=ha(this,va))==null||t.setAttribute("aria-expanded","false"),this.dispatchEvent(new Event("close",{composed:!0,bubbles:!0}))};vd=new WeakSet;nv=function(t){Bu(this,va,t.relatedTarget),_i(this,t.relatedTarget)||(this.open=!this.open)};fd=new WeakSet;sv=function(t){var e;_i(this,t.relatedTarget)||((e=ha(this,Dn))==null||e.focus(),ha(this,va)&&ha(this,va)!==t.relatedTarget&&this.open&&(this.open=!1))};Ed=new WeakSet;ov=function(t){var e,i,a,r,n;const{key:s,ctrlKey:o,altKey:l,metaKey:u}=t;o||l||u||this.keysUsed.includes(s)&&(t.preventDefault(),t.stopPropagation(),s==="Tab"?(t.shiftKey?(i=(e=this.previousElementSibling)==null?void 0:e.focus)==null||i.call(e):(r=(a=this.nextElementSibling)==null?void 0:a.focus)==null||r.call(a),this.blur()):s==="Escape"&&((n=ha(this,Dn))==null||n.focus(),this.open=!1))};br.shadowRootOptions={mode:"open"};br.getTemplateHTML=w1;br.getSlotTemplateHTML=I1;_.customElements.get("media-chrome-dialog")||_.customElements.define("media-chrome-dialog",br);var Wu=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},de=(t,e,i)=>(Wu(t,e,"read from private field"),i?i.call(t):e.get(t)),Me=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},ki=(t,e,i,a)=>(Wu(t,e,"write to private field"),e.set(t,i),i),Tt=(t,e,i)=>(Wu(t,e,"access private method"),i),Pt,ul,Is,Rs,At,Lo,Ls,Cs,Ds,Fu,lv,Ms,_d,Os,bd,Co,Ku,gd,dv,yd,uv,Td,cv,Ad,hv;function R1(t){return`
    <style>
      :host {
        --_focus-box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        --_media-range-padding: var(--media-range-padding, var(--media-control-padding, 10px));

        box-shadow: var(--_focus-visible-box-shadow, none);
        background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        height: calc(var(--media-control-height, 24px) + 2 * var(--_media-range-padding));
        display: inline-flex;
        align-items: center;
        
        vertical-align: middle;
        box-sizing: border-box;
        position: relative;
        width: 100px;
        transition: background .15s linear;
        cursor: var(--media-cursor, pointer);
        pointer-events: auto;
        touch-action: none; 
      }

      
      input[type=range]:focus {
        outline: 0;
      }
      input[type=range]:focus::-webkit-slider-runnable-track {
        outline: 0;
      }

      :host(:hover) {
        background: var(--media-control-hover-background, rgb(50 50 70 / .7));
      }

      #leftgap {
        padding-left: var(--media-range-padding-left, var(--_media-range-padding));
      }

      #rightgap {
        padding-right: var(--media-range-padding-right, var(--_media-range-padding));
      }

      #startpoint,
      #endpoint {
        position: absolute;
      }

      #endpoint {
        right: 0;
      }

      #container {
        
        width: var(--media-range-track-width, 100%);
        transform: translate(var(--media-range-track-translate-x, 0px), var(--media-range-track-translate-y, 0px));
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        min-width: 40px;
      }

      #range {
        
        display: var(--media-time-range-hover-display, block);
        bottom: var(--media-time-range-hover-bottom, 0);
        height: var(--media-time-range-hover-height, max(100% , 25px));
        width: 100%;
        position: absolute;
        cursor: var(--media-cursor, pointer);

        -webkit-appearance: none; 
        -webkit-tap-highlight-color: transparent;
        background: transparent; 
        margin: 0;
        z-index: 1;
      }

      @media (hover: hover) {
        #range {
          bottom: var(--media-time-range-hover-bottom, 0);
          height: var(--media-time-range-hover-height, max(100%, 20px));
        }
      }

      
      
      #range::-webkit-slider-thumb {
        -webkit-appearance: none;
        background: transparent;
        width: .1px;
        height: .1px;
      }

      
      #range::-moz-range-thumb {
        background: transparent;
        border: transparent;
        width: .1px;
        height: .1px;
      }

      #appearance {
        height: var(--media-range-track-height, 4px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: 100%;
        position: absolute;
        
        will-change: transform;
      }

      #track {
        background: var(--media-range-track-background, rgb(255 255 255 / .2));
        border-radius: var(--media-range-track-border-radius, 1px);
        border: var(--media-range-track-border, none);
        outline: var(--media-range-track-outline);
        outline-offset: var(--media-range-track-outline-offset);
        backdrop-filter: var(--media-range-track-backdrop-filter);
        -webkit-backdrop-filter: var(--media-range-track-backdrop-filter);
        box-shadow: var(--media-range-track-box-shadow, none);
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      #progress,
      #pointer {
        position: absolute;
        height: 100%;
        will-change: width;
      }

      #progress {
        background: var(--media-range-bar-color, var(--media-primary-color, rgb(238 238 238)));
        transition: var(--media-range-track-transition);
      }

      #pointer {
        background: var(--media-range-track-pointer-background);
        border-right: var(--media-range-track-pointer-border-right);
        transition: visibility .25s, opacity .25s;
        visibility: hidden;
        opacity: 0;
      }

      @media (hover: hover) {
        :host(:hover) #pointer {
          transition: visibility .5s, opacity .5s;
          visibility: visible;
          opacity: 1;
        }
      }

      #thumb,
      ::slotted([slot=thumb]) {
        width: var(--media-range-thumb-width, 10px);
        height: var(--media-range-thumb-height, 10px);
        transition: var(--media-range-thumb-transition);
        transform: var(--media-range-thumb-transform, none);
        opacity: var(--media-range-thumb-opacity, 1);
        translate: -50%;
        position: absolute;
        left: 0;
        cursor: var(--media-cursor, pointer);
      }

      #thumb {
        border-radius: var(--media-range-thumb-border-radius, 10px);
        background: var(--media-range-thumb-background, var(--media-primary-color, rgb(238 238 238)));
        box-shadow: var(--media-range-thumb-box-shadow, 1px 1px 1px transparent);
        border: var(--media-range-thumb-border, none);
      }

      :host([disabled]) #thumb {
        background-color: #777;
      }

      .segments #appearance {
        height: var(--media-range-segment-hover-height, 7px);
      }

      #track {
        clip-path: url(#segments-clipping);
      }

      #segments {
        --segments-gap: var(--media-range-segments-gap, 2px);
        position: absolute;
        width: 100%;
        height: 100%;
      }

      #segments-clipping {
        transform: translateX(calc(var(--segments-gap) / 2));
      }

      #segments-clipping:empty {
        display: none;
      }

      #segments-clipping rect {
        height: var(--media-range-track-height, 4px);
        y: calc((var(--media-range-segment-hover-height, 7px) - var(--media-range-track-height, 4px)) / 2);
        transition: var(--media-range-segment-transition, transform .1s ease-in-out);
        transform: var(--media-range-segment-transform, scaleY(1));
        transform-origin: center;
      }

      /* Visible label for accessibility - positioned off-screen but technically visible (Firefox requires visible labels) */
      #range-label {
        position: absolute;
        left: -10000px;
        background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        pointer-events: none;
      }
    </style>
    <div id="leftgap"></div>
    <div id="container">
      <div id="startpoint"></div>
      <div id="endpoint"></div>
      <div id="appearance">
        <div id="track" part="track">
          <div id="pointer"></div>
          <div id="progress" part="progress"></div>
        </div>
        <slot name="thumb">
          <div id="thumb" part="thumb"></div>
        </slot>
        <svg id="segments" aria-hidden="true"><clipPath id="segments-clipping"></clipPath></svg>
      </div>
        <input id="range" type="range" min="0" max="1" step="any" value="0">
        <label for="range" id="range-label"></label>

      ${this.getContainerTemplateHTML(t)}
    </div>
    <div id="rightgap"></div>
  `}function L1(t){return""}class gr extends _.HTMLElement{constructor(){if(super(),Me(this,Fu),Me(this,Ms),Me(this,Os),Me(this,Co),Me(this,gd),Me(this,yd),Me(this,Td),Me(this,Ad),Me(this,Pt,void 0),Me(this,ul,void 0),Me(this,Is,void 0),Me(this,Rs,void 0),Me(this,At,{}),Me(this,Lo,[]),Me(this,Ls,()=>{if(this.range.matches(":focus-visible")){const{style:e}=ke(this.shadowRoot,":host");e.setProperty("--_focus-visible-box-shadow","var(--_focus-box-shadow)")}}),Me(this,Cs,()=>{const{style:e}=ke(this.shadowRoot,":host");e.removeProperty("--_focus-visible-box-shadow")}),Me(this,Ds,()=>{const e=this.shadowRoot.querySelector("#segments-clipping");e&&e.parentNode.append(e)}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes),i=this.constructor.getTemplateHTML(e);this.shadowRoot.setHTMLUnsafe?this.shadowRoot.setHTMLUnsafe(i):this.shadowRoot.innerHTML=i}this.container=this.shadowRoot.querySelector("#container"),ki(this,Is,this.shadowRoot.querySelector("#startpoint")),ki(this,Rs,this.shadowRoot.querySelector("#endpoint")),this.range=this.shadowRoot.querySelector("#range"),this.appearance=this.shadowRoot.querySelector("#appearance")}static get observedAttributes(){return["disabled","aria-disabled",Q.MEDIA_CONTROLLER]}attributeChangedCallback(e,i,a){var r,n,s,o,l;e===Q.MEDIA_CONTROLLER?(i&&((n=(r=de(this,Pt))==null?void 0:r.unassociateElement)==null||n.call(r,this),ki(this,Pt,null)),a&&this.isConnected&&(ki(this,Pt,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=de(this,Pt))==null?void 0:o.associateElement)==null||l.call(o,this))):(e==="disabled"||e==="aria-disabled"&&i!==a)&&(a==null?(this.range.removeAttribute(e),Tt(this,Ms,_d).call(this)):(this.range.setAttribute(e,a),Tt(this,Os,bd).call(this)))}connectedCallback(){var e,i,a;const{style:r}=ke(this.shadowRoot,":host");r.setProperty("display",`var(--media-control-display, var(--${this.localName}-display, inline-flex))`),de(this,At).pointer=ke(this.shadowRoot,"#pointer"),de(this,At).progress=ke(this.shadowRoot,"#progress"),de(this,At).thumb=ke(this.shadowRoot,'#thumb, ::slotted([slot="thumb"])'),de(this,At).activeSegment=ke(this.shadowRoot,"#segments-clipping rect:nth-child(0)");const n=this.getAttribute(Q.MEDIA_CONTROLLER);n&&(ki(this,Pt,(e=this.getRootNode())==null?void 0:e.getElementById(n)),(a=(i=de(this,Pt))==null?void 0:i.associateElement)==null||a.call(i,this)),this.updateBar(),this.shadowRoot.addEventListener("focusin",de(this,Ls)),this.shadowRoot.addEventListener("focusout",de(this,Cs)),Tt(this,Ms,_d).call(this),hr(this.container,de(this,Ds))}disconnectedCallback(){var e,i;Tt(this,Os,bd).call(this),(i=(e=de(this,Pt))==null?void 0:e.unassociateElement)==null||i.call(e,this),ki(this,Pt,null),this.shadowRoot.removeEventListener("focusin",de(this,Ls)),this.shadowRoot.removeEventListener("focusout",de(this,Cs)),mr(this.container,de(this,Ds))}updatePointerBar(e){var i;(i=de(this,At).pointer)==null||i.style.setProperty("width",`${this.getPointerRatio(e)*100}%`)}updateBar(){var e,i;const a=this.range.valueAsNumber*100;(e=de(this,At).progress)==null||e.style.setProperty("width",`${a}%`),(i=de(this,At).thumb)==null||i.style.setProperty("left",`${a}%`)}updateSegments(e){const i=this.shadowRoot.querySelector("#segments-clipping");if(i.textContent="",this.container.classList.toggle("segments",!!e?.length),!e?.length)return;const a=[...new Set([+this.range.min,...e.flatMap(n=>[n.start,n.end]),+this.range.max])];ki(this,Lo,[...a]);const r=a.pop();for(const[n,s]of a.entries()){const[o,l]=[n===0,n===a.length-1],u=o?"calc(var(--segments-gap) / -1)":`${s*100}%`,p=`calc(${((l?r:a[n+1])-s)*100}%${o||l?"":" - var(--segments-gap)"})`,h=ye.createElementNS("http://www.w3.org/2000/svg","rect"),d=Ru(this.shadowRoot,`#segments-clipping rect:nth-child(${n+1})`);d.style.setProperty("x",u),d.style.setProperty("width",p),i.append(h)}}getPointerRatio(e){return y0(e.clientX,e.clientY,de(this,Is).getBoundingClientRect(),de(this,Rs).getBoundingClientRect())}get dragging(){return this.hasAttribute("dragging")}handleEvent(e){switch(e.type){case"pointermove":Tt(this,Ad,hv).call(this,e);break;case"input":this.updateBar();break;case"pointerenter":Tt(this,gd,dv).call(this,e);break;case"pointerdown":Tt(this,Co,Ku).call(this,e);break;case"pointerup":Tt(this,yd,uv).call(this);break;case"pointerleave":Tt(this,Td,cv).call(this);break}}get keysUsed(){return["ArrowUp","ArrowRight","ArrowDown","ArrowLeft"]}}Pt=new WeakMap;ul=new WeakMap;Is=new WeakMap;Rs=new WeakMap;At=new WeakMap;Lo=new WeakMap;Ls=new WeakMap;Cs=new WeakMap;Ds=new WeakMap;Fu=new WeakSet;lv=function(t){const e=de(this,At).activeSegment;if(!e)return;const i=this.getPointerRatio(t),r=`#segments-clipping rect:nth-child(${de(this,Lo).findIndex((n,s,o)=>{const l=o[s+1];return l!=null&&i>=n&&i<=l})+1})`;(e.selectorText!=r||!e.style.transform)&&(e.selectorText=r,e.style.setProperty("transform","var(--media-range-segment-hover-transform, scaleY(2))"))};Ms=new WeakSet;_d=function(){this.hasAttribute("disabled")||!this.isConnected||(this.addEventListener("input",this),this.addEventListener("pointerdown",this),this.addEventListener("pointerenter",this))};Os=new WeakSet;bd=function(){var t,e;this.removeEventListener("input",this),this.removeEventListener("pointerdown",this),this.removeEventListener("pointerenter",this),this.removeEventListener("pointerleave",this),(t=_.window)==null||t.removeEventListener("pointerup",this),(e=_.window)==null||e.removeEventListener("pointermove",this)};Co=new WeakSet;Ku=function(t){var e;ki(this,ul,t.composedPath().includes(this.range)),(e=_.window)==null||e.addEventListener("pointerup",this,{once:!0})};gd=new WeakSet;dv=function(t){var e;t.pointerType!=="mouse"&&Tt(this,Co,Ku).call(this,t),this.addEventListener("pointerleave",this,{once:!0}),(e=_.window)==null||e.addEventListener("pointermove",this)};yd=new WeakSet;uv=function(){var t;(t=_.window)==null||t.removeEventListener("pointerup",this),this.toggleAttribute("dragging",!1),this.range.disabled=this.hasAttribute("disabled")};Td=new WeakSet;cv=function(){var t,e;this.removeEventListener("pointerleave",this),(t=_.window)==null||t.removeEventListener("pointermove",this),this.toggleAttribute("dragging",!1),this.range.disabled=this.hasAttribute("disabled"),(e=de(this,At).activeSegment)==null||e.style.removeProperty("transform")};Ad=new WeakSet;hv=function(t){t.pointerType==="pen"&&t.buttons===0||(this.toggleAttribute("dragging",t.buttons===1||t.pointerType!=="mouse"),this.updatePointerBar(t),Tt(this,Fu,lv).call(this,t),this.dragging&&(t.pointerType!=="mouse"||!de(this,ul))&&(this.range.disabled=!0,this.range.valueAsNumber=this.getPointerRatio(t),this.range.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))))};gr.shadowRootOptions={mode:"open"};gr.getTemplateHTML=R1;gr.getContainerTemplateHTML=L1;_.customElements.get("media-chrome-range")||_.customElements.define("media-chrome-range",gr);var mv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},zn=(t,e,i)=>(mv(t,e,"read from private field"),i?i.call(t):e.get(t)),C1=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Qn=(t,e,i,a)=>(mv(t,e,"write to private field"),e.set(t,i),i),$t;function D1(t){return`
    <style>
      :host {
        
        box-sizing: border-box;
        display: var(--media-control-display, var(--media-control-bar-display, inline-flex));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        --media-loading-indicator-icon-height: 44px;
      }

      ::slotted(media-time-range),
      ::slotted(media-volume-range) {
        min-height: 100%;
      }

      ::slotted(media-time-range),
      ::slotted(media-clip-selector) {
        flex-grow: 1;
      }

      ::slotted([role="menu"]) {
        position: absolute;
      }
    </style>

    <slot></slot>
  `}class Vu extends _.HTMLElement{constructor(){if(super(),C1(this,$t,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[Q.MEDIA_CONTROLLER]}attributeChangedCallback(e,i,a){var r,n,s,o,l;e===Q.MEDIA_CONTROLLER&&(i&&((n=(r=zn(this,$t))==null?void 0:r.unassociateElement)==null||n.call(r,this),Qn(this,$t,null)),a&&this.isConnected&&(Qn(this,$t,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=zn(this,$t))==null?void 0:o.associateElement)==null||l.call(o,this)))}connectedCallback(){var e,i,a;const r=this.getAttribute(Q.MEDIA_CONTROLLER);r&&(Qn(this,$t,(e=this.getRootNode())==null?void 0:e.getElementById(r)),(a=(i=zn(this,$t))==null?void 0:i.associateElement)==null||a.call(i,this))}disconnectedCallback(){var e,i;(i=(e=zn(this,$t))==null?void 0:e.unassociateElement)==null||i.call(e,this),Qn(this,$t,null)}}$t=new WeakMap;Vu.shadowRootOptions={mode:"open"};Vu.getTemplateHTML=D1;_.customElements.get("media-control-bar")||_.customElements.define("media-control-bar",Vu);var pv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},jn=(t,e,i)=>(pv(t,e,"read from private field"),i?i.call(t):e.get(t)),M1=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Zn=(t,e,i,a)=>(pv(t,e,"write to private field"),e.set(t,i),i),Ut;function O1(t,e={}){return`
    <style>
      :host {
        font: var(--media-font,
          var(--media-font-weight, normal)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        background: var(--media-text-background, var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7))));
        padding: var(--media-control-padding, 10px);
        display: inline-flex;
        justify-content: center;
        align-items: center;
        vertical-align: middle;
        box-sizing: border-box;
        text-align: center;
        pointer-events: auto;
      }

      
      :host(:focus-visible) {
        box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        outline: 0;
      }

      
      :host(:where(:focus)) {
        box-shadow: none;
        outline: 0;
      }
    </style>

    ${this.getSlotTemplateHTML(t,e)}
  `}function x1(t,e){return`
    <slot></slot>
  `}class Fi extends _.HTMLElement{constructor(){if(super(),M1(this,Ut,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[Q.MEDIA_CONTROLLER]}attributeChangedCallback(e,i,a){var r,n,s,o,l;e===Q.MEDIA_CONTROLLER&&(i&&((n=(r=jn(this,Ut))==null?void 0:r.unassociateElement)==null||n.call(r,this),Zn(this,Ut,null)),a&&this.isConnected&&(Zn(this,Ut,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=jn(this,Ut))==null?void 0:o.associateElement)==null||l.call(o,this)))}connectedCallback(){var e,i,a;const{style:r}=ke(this.shadowRoot,":host");r.setProperty("display",`var(--media-control-display, var(--${this.localName}-display, inline-flex))`);const n=this.getAttribute(Q.MEDIA_CONTROLLER);n&&(Zn(this,Ut,(e=this.getRootNode())==null?void 0:e.getElementById(n)),(a=(i=jn(this,Ut))==null?void 0:i.associateElement)==null||a.call(i,this))}disconnectedCallback(){var e,i;(i=(e=jn(this,Ut))==null?void 0:e.unassociateElement)==null||i.call(e,this),Zn(this,Ut,null)}}Ut=new WeakMap;Fi.shadowRootOptions={mode:"open"};Fi.getTemplateHTML=O1;Fi.getSlotTemplateHTML=x1;_.customElements.get("media-text-display")||_.customElements.define("media-text-display",Fi);var vv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Uh=(t,e,i)=>(vv(t,e,"read from private field"),i?i.call(t):e.get(t)),N1=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},P1=(t,e,i,a)=>(vv(t,e,"write to private field"),e.set(t,i),i),Qr;function $1(t,e){return`
    <slot>${Bi(e.mediaDuration)}</slot>
  `}class fv extends Fi{constructor(){var e;super(),N1(this,Qr,void 0),P1(this,Qr,this.shadowRoot.querySelector("slot")),Uh(this,Qr).textContent=Bi((e=this.mediaDuration)!=null?e:0)}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_DURATION]}attributeChangedCallback(e,i,a){e===c.MEDIA_DURATION&&(Uh(this,Qr).textContent=Bi(+a)),super.attributeChangedCallback(e,i,a)}get mediaDuration(){return ie(this,c.MEDIA_DURATION)}set mediaDuration(e){ce(this,c.MEDIA_DURATION,e)}}Qr=new WeakMap;fv.getSlotTemplateHTML=$1;_.customElements.get("media-duration-display")||_.customElements.define("media-duration-display",fv);const U1={2:R("Network Error"),3:R("Decode Error"),4:R("Source Not Supported"),5:R("Encryption Error")},H1={2:R("A network error caused the media download to fail."),3:R("A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format."),4:R("An unsupported error occurred. The server or network failed, or your browser does not support this format."),5:R("The media is encrypted and there are no keys to decrypt it.")},qu=t=>{var e,i;return t.code===1?null:{title:(e=U1[t.code])!=null?e:`Error ${t.code}`,message:(i=H1[t.code])!=null?i:t.message}};var Ev=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},B1=(t,e,i)=>(Ev(t,e,"read from private field"),i?i.call(t):e.get(t)),W1=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},F1=(t,e,i,a)=>(Ev(t,e,"write to private field"),e.set(t,i),i),xs;function K1(t){return`
    <style>
      :host {
        background: rgb(20 20 30 / .8);
      }

      #content {
        display: block;
        padding: 1.2em 1.5em;
      }

      h3,
      p {
        margin-block: 0 .3em;
      }
    </style>
    <slot name="error-${t.mediaerrorcode}" id="content">
      ${_v({code:+t.mediaerrorcode,message:t.mediaerrormessage})}
    </slot>
  `}function V1(t){return t.code&&qu(t)!==null}function _v(t){var e;const{title:i,message:a}=(e=qu(t))!=null?e:{};let r="";return i&&(r+=`<slot name="error-${t.code}-title"><h3>${i}</h3></slot>`),a&&(r+=`<slot name="error-${t.code}-message"><p>${a}</p></slot>`),r}const Hh=[c.MEDIA_ERROR_CODE,c.MEDIA_ERROR_MESSAGE];class cl extends br{constructor(){super(...arguments),W1(this,xs,null)}static get observedAttributes(){return[...super.observedAttributes,...Hh]}formatErrorMessage(e){return this.constructor.formatErrorMessage(e)}attributeChangedCallback(e,i,a){var r;if(super.attributeChangedCallback(e,i,a),!Hh.includes(e))return;const n=(r=this.mediaError)!=null?r:{code:this.mediaErrorCode,message:this.mediaErrorMessage};if(this.open=V1(n),this.open&&(this.shadowRoot.querySelector("slot").name=`error-${this.mediaErrorCode}`,this.shadowRoot.querySelector("#content").innerHTML=this.formatErrorMessage(n),!this.hasAttribute("aria-label"))){const{title:s}=qu(n);s&&this.setAttribute("aria-label",s)}}get mediaError(){return B1(this,xs)}set mediaError(e){F1(this,xs,e)}get mediaErrorCode(){return ie(this,"mediaerrorcode")}set mediaErrorCode(e){ce(this,"mediaerrorcode",e)}get mediaErrorMessage(){return oe(this,"mediaerrormessage")}set mediaErrorMessage(e){ae(this,"mediaerrormessage",e)}}xs=new WeakMap;cl.getSlotTemplateHTML=K1;cl.formatErrorMessage=_v;_.customElements.get("media-error-dialog")||_.customElements.define("media-error-dialog",cl);var bv=cl,q1=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},gi=(t,e,i)=>(q1(t,e,"read from private field"),i?i.call(t):e.get(t)),Bh=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Ma,Oa;function Y1(t){return`
    <style>
      :host {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 9999;
        background: rgb(20 20 30 / .8);
        backdrop-filter: blur(10px);
      }

      #content {
        display: block;
        width: clamp(400px, 40vw, 700px);
        max-width: 90vw;
        text-align: left;
      }

      h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        font-weight: 500;
        text-align: center;
      }

      .shortcuts-table {
        width: 100%;
        border-collapse: collapse;
      }

      .shortcuts-table tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .shortcuts-table tr:last-child {
        border-bottom: none;
      }

      .shortcuts-table td {
        padding: 0.75rem 0.5rem;
      }

      .shortcuts-table td:first-child {
        text-align: right;
        padding-right: 1rem;
        width: 40%;
        min-width: 120px;
      }

      .shortcuts-table td:last-child {
        padding-left: 1rem;
      }

      .key {
        display: inline-block;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        font-weight: 500;
        min-width: 1.5rem;
        text-align: center;
        margin: 0 0.2rem;
      }

      .description {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.95rem;
      }

      .key-combo {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.3rem;
      }

      .key-separator {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9rem;
      }
    </style>
    <slot id="content">
      ${G1()}
    </slot>
  `}function G1(){return`
    <h2>Keyboard Shortcuts</h2>
    <table class="shortcuts-table">${[{keys:["Space","k"],description:"Toggle Playback"},{keys:["m"],description:"Toggle mute"},{keys:["f"],description:"Toggle fullscreen"},{keys:["c"],description:"Toggle captions or subtitles, if available"},{keys:["p"],description:"Toggle Picture in Picture"},{keys:["←","j"],description:"Seek back 10s"},{keys:["→","l"],description:"Seek forward 10s"},{keys:["↑"],description:"Turn volume up"},{keys:["↓"],description:"Turn volume down"},{keys:["< (SHIFT+,)"],description:"Decrease playback rate"},{keys:["> (SHIFT+.)"],description:"Increase playback rate"}].map(({keys:i,description:a})=>`
      <tr>
        <td>
          <div class="key-combo">${i.map((n,s)=>s>0?`<span class="key-separator">or</span><span class="key">${n}</span>`:`<span class="key">${n}</span>`).join("")}</div>
        </td>
        <td class="description">${a}</td>
      </tr>
    `).join("")}</table>
  `}class gv extends br{constructor(){super(...arguments),Bh(this,Ma,e=>{var i;if(!this.open)return;const a=(i=this.shadowRoot)==null?void 0:i.querySelector("#content");if(!a)return;const r=e.composedPath(),n=r[0]===this||r.includes(this),s=r.includes(a);n&&!s&&(this.open=!1)}),Bh(this,Oa,e=>{if(!this.open)return;const i=e.shiftKey&&(e.key==="/"||e.key==="?");(e.key==="Escape"||i)&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&(this.open=!1,e.preventDefault(),e.stopPropagation())})}connectedCallback(){super.connectedCallback(),this.open&&(this.addEventListener("click",gi(this,Ma)),document.addEventListener("keydown",gi(this,Oa)))}disconnectedCallback(){this.removeEventListener("click",gi(this,Ma)),document.removeEventListener("keydown",gi(this,Oa))}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e==="open"&&(this.open?(this.addEventListener("click",gi(this,Ma)),document.addEventListener("keydown",gi(this,Oa))):(this.removeEventListener("click",gi(this,Ma)),document.removeEventListener("keydown",gi(this,Oa))))}}Ma=new WeakMap;Oa=new WeakMap;gv.getSlotTemplateHTML=Y1;_.customElements.get("media-keyboard-shortcuts-dialog")||_.customElements.define("media-keyboard-shortcuts-dialog",gv);var yv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},z1=(t,e,i)=>(yv(t,e,"read from private field"),e.get(t)),Q1=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},j1=(t,e,i,a)=>(yv(t,e,"write to private field"),e.set(t,i),i),Ns;const Z1=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M16 3v2.5h3.5V9H22V3h-6ZM4 9h2.5V5.5H10V3H4v6Zm15.5 9.5H16V21h6v-6h-2.5v3.5ZM6.5 15H4v6h6v-2.5H6.5V15Z"/>
</svg>`,X1=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M18.5 6.5V3H16v6h6V6.5h-3.5ZM16 21h2.5v-3.5H22V15h-6v6ZM4 17.5h3.5V21H10v-6H4v2.5Zm3.5-11H4V9h6V3H7.5v3.5Z"/>
</svg>`;function J1(t){return`
    <style>
      :host([${c.MEDIA_IS_FULLSCREEN}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      
      :host(:not([${c.MEDIA_IS_FULLSCREEN}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${c.MEDIA_IS_FULLSCREEN}]) slot[name=tooltip-enter],
      :host(:not([${c.MEDIA_IS_FULLSCREEN}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${Z1}</slot>
      <slot name="exit">${X1}</slot>
    </slot>
  `}function ey(){return`
    <slot name="tooltip-enter">${R("Enter fullscreen mode")}</slot>
    <slot name="tooltip-exit">${R("Exit fullscreen mode")}</slot>
  `}const Wh=t=>{const e=t.mediaIsFullscreen?R("exit fullscreen mode"):R("enter fullscreen mode");t.setAttribute("aria-label",e)};class Yu extends De{constructor(){super(...arguments),Q1(this,Ns,null)}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_IS_FULLSCREEN,c.MEDIA_FULLSCREEN_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),Wh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_IS_FULLSCREEN&&Wh(this)}get mediaFullscreenUnavailable(){return oe(this,c.MEDIA_FULLSCREEN_UNAVAILABLE)}set mediaFullscreenUnavailable(e){ae(this,c.MEDIA_FULLSCREEN_UNAVAILABLE,e)}get mediaIsFullscreen(){return q(this,c.MEDIA_IS_FULLSCREEN)}set mediaIsFullscreen(e){Y(this,c.MEDIA_IS_FULLSCREEN,e)}handleClick(e){j1(this,Ns,e);const i=z1(this,Ns)instanceof PointerEvent,a=this.mediaIsFullscreen?new _.CustomEvent(L.MEDIA_EXIT_FULLSCREEN_REQUEST,{composed:!0,bubbles:!0}):new _.CustomEvent(L.MEDIA_ENTER_FULLSCREEN_REQUEST,{composed:!0,bubbles:!0,detail:i});this.dispatchEvent(a)}}Ns=new WeakMap;Yu.getSlotTemplateHTML=J1;Yu.getTooltipContentHTML=ey;_.customElements.get("media-fullscreen-button")||_.customElements.define("media-fullscreen-button",Yu);const{MEDIA_TIME_IS_LIVE:Ps,MEDIA_PAUSED:pn}=c,{MEDIA_SEEK_TO_LIVE_REQUEST:ty,MEDIA_PLAY_REQUEST:iy}=L,ay='<svg viewBox="0 0 6 12" aria-hidden="true"><circle cx="3" cy="6" r="2"></circle></svg>';function ry(t){return`
    <style>
      :host { --media-tooltip-display: none; }
      
      slot[name=indicator] > *,
      :host ::slotted([slot=indicator]) {
        
        min-width: auto;
        fill: var(--media-live-button-icon-color, rgb(140, 140, 140));
        color: var(--media-live-button-icon-color, rgb(140, 140, 140));
      }

      :host([${Ps}]:not([${pn}])) slot[name=indicator] > *,
      :host([${Ps}]:not([${pn}])) ::slotted([slot=indicator]) {
        fill: var(--media-live-button-indicator-color, rgb(255, 0, 0));
        color: var(--media-live-button-indicator-color, rgb(255, 0, 0));
      }

      :host([${Ps}]:not([${pn}])) {
        cursor: var(--media-cursor, not-allowed);
      }

      slot[name=text]{
        text-transform: uppercase;
      }

    </style>

    <slot name="indicator">${ay}</slot>
    
    <slot name="spacer">&nbsp;</slot><slot name="text">${R("live")}</slot>
  `}const Fh=t=>{var e;const i=t.mediaPaused||!t.mediaTimeIsLive,a=R(i?"seek to live":"playing live");t.setAttribute("aria-label",a);const r=(e=t.shadowRoot)==null?void 0:e.querySelector('slot[name="text"]');r&&(r.textContent=R("live")),i?t.removeAttribute("aria-disabled"):t.setAttribute("aria-disabled","true")};class Tv extends De{static get observedAttributes(){return[...super.observedAttributes,Ps,pn]}connectedCallback(){super.connectedCallback(),Fh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),Fh(this)}get mediaPaused(){return q(this,c.MEDIA_PAUSED)}set mediaPaused(e){Y(this,c.MEDIA_PAUSED,e)}get mediaTimeIsLive(){return q(this,c.MEDIA_TIME_IS_LIVE)}set mediaTimeIsLive(e){Y(this,c.MEDIA_TIME_IS_LIVE,e)}handleClick(){!this.mediaPaused&&this.mediaTimeIsLive||(this.dispatchEvent(new _.CustomEvent(ty,{composed:!0,bubbles:!0})),this.hasAttribute(pn)&&this.dispatchEvent(new _.CustomEvent(iy,{composed:!0,bubbles:!0})))}}Tv.getSlotTemplateHTML=ry;_.customElements.get("media-live-button")||_.customElements.define("media-live-button",Tv);var Av=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Lr=(t,e,i)=>(Av(t,e,"read from private field"),i?i.call(t):e.get(t)),Kh=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Cr=(t,e,i,a)=>(Av(t,e,"write to private field"),e.set(t,i),i),Ht,$s;const Xn={LOADING_DELAY:"loadingdelay",NO_AUTOHIDE:"noautohide"},kv=500,ny=`
<svg aria-hidden="true" viewBox="0 0 100 100">
  <path d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50">
    <animateTransform
       attributeName="transform"
       attributeType="XML"
       type="rotate"
       dur="1s"
       from="0 50 50"
       to="360 50 50"
       repeatCount="indefinite" />
  </path>
</svg>
`;function sy(t){return`
    <style>
      :host {
        display: var(--media-control-display, var(--media-loading-indicator-display, inline-block));
        vertical-align: middle;
        box-sizing: border-box;
        --_loading-indicator-delay: var(--media-loading-indicator-transition-delay, ${kv}ms);
      }

      #status {
        color: rgba(0,0,0,0);
        width: 0px;
        height: 0px;
      }

      :host slot[name=icon] > *,
      :host ::slotted([slot=icon]) {
        opacity: var(--media-loading-indicator-opacity, 0);
        transition: opacity 0.15s;
      }

      :host([${c.MEDIA_LOADING}]:not([${c.MEDIA_PAUSED}])) slot[name=icon] > *,
      :host([${c.MEDIA_LOADING}]:not([${c.MEDIA_PAUSED}])) ::slotted([slot=icon]) {
        opacity: var(--media-loading-indicator-opacity, 1);
        transition: opacity 0.15s var(--_loading-indicator-delay);
      }

      :host #status {
        visibility: var(--media-loading-indicator-opacity, hidden);
        transition: visibility 0.15s;
      }

      :host([${c.MEDIA_LOADING}]:not([${c.MEDIA_PAUSED}])) #status {
        visibility: var(--media-loading-indicator-opacity, visible);
        transition: visibility 0.15s var(--_loading-indicator-delay);
      }

      svg, img, ::slotted(svg), ::slotted(img) {
        width: var(--media-loading-indicator-icon-width);
        height: var(--media-loading-indicator-icon-height, 100px);
        fill: var(--media-icon-color, var(--media-primary-color, rgb(238 238 238)));
        vertical-align: middle;
      }
    </style>

    <slot name="icon">${ny}</slot>
    <div id="status" role="status" aria-live="polite">${R("media loading")}</div>
  `}class Gu extends _.HTMLElement{constructor(){if(super(),Kh(this,Ht,void 0),Kh(this,$s,kv),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[Q.MEDIA_CONTROLLER,c.MEDIA_PAUSED,c.MEDIA_LOADING,Xn.LOADING_DELAY]}attributeChangedCallback(e,i,a){var r,n,s,o,l;e===Xn.LOADING_DELAY&&i!==a?this.loadingDelay=Number(a):e===Q.MEDIA_CONTROLLER&&(i&&((n=(r=Lr(this,Ht))==null?void 0:r.unassociateElement)==null||n.call(r,this),Cr(this,Ht,null)),a&&this.isConnected&&(Cr(this,Ht,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=Lr(this,Ht))==null?void 0:o.associateElement)==null||l.call(o,this)))}connectedCallback(){var e,i,a;const r=this.getAttribute(Q.MEDIA_CONTROLLER);r&&(Cr(this,Ht,(e=this.getRootNode())==null?void 0:e.getElementById(r)),(a=(i=Lr(this,Ht))==null?void 0:i.associateElement)==null||a.call(i,this))}disconnectedCallback(){var e,i;(i=(e=Lr(this,Ht))==null?void 0:e.unassociateElement)==null||i.call(e,this),Cr(this,Ht,null)}get loadingDelay(){return Lr(this,$s)}set loadingDelay(e){Cr(this,$s,e);const{style:i}=ke(this.shadowRoot,":host");i.setProperty("--_loading-indicator-delay",`var(--media-loading-indicator-transition-delay, ${e}ms)`)}get mediaPaused(){return q(this,c.MEDIA_PAUSED)}set mediaPaused(e){Y(this,c.MEDIA_PAUSED,e)}get mediaLoading(){return q(this,c.MEDIA_LOADING)}set mediaLoading(e){Y(this,c.MEDIA_LOADING,e)}get mediaController(){return oe(this,Q.MEDIA_CONTROLLER)}set mediaController(e){ae(this,Q.MEDIA_CONTROLLER,e)}get noAutohide(){return q(this,Xn.NO_AUTOHIDE)}set noAutohide(e){Y(this,Xn.NO_AUTOHIDE,e)}}Ht=new WeakMap;$s=new WeakMap;Gu.shadowRootOptions={mode:"open"};Gu.getTemplateHTML=sy;_.customElements.get("media-loading-indicator")||_.customElements.define("media-loading-indicator",Gu);const oy=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45a4.22 4.22 0 0 0 .05-.63Zm2.5 0a6.84 6.84 0 0 1-.54 2.64L20 16.15A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25A6.92 6.92 0 0 1 14 18.7v2.06A9 9 0 0 0 17.69 19l2 2.05L21 19.73l-9-9L4.27 3ZM12 4 9.91 6.09 12 8.18V4Z"/>
</svg>`,Vh=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4Z"/>
</svg>`,ly=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4ZM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54Z"/>
</svg>`;function dy(t){return`
    <style>
      :host(:not([${c.MEDIA_VOLUME_LEVEL}])) slot[name=icon] slot:not([name=high]),
      :host([${c.MEDIA_VOLUME_LEVEL}=high]) slot[name=icon] slot:not([name=high]) {
        display: none !important;
      }

      :host([${c.MEDIA_VOLUME_LEVEL}=off]) slot[name=icon] slot:not([name=off]) {
        display: none !important;
      }

      :host([${c.MEDIA_VOLUME_LEVEL}=low]) slot[name=icon] slot:not([name=low]) {
        display: none !important;
      }

      :host([${c.MEDIA_VOLUME_LEVEL}=medium]) slot[name=icon] slot:not([name=medium]) {
        display: none !important;
      }

      :host(:not([${c.MEDIA_VOLUME_LEVEL}=off])) slot[name=tooltip-unmute],
      :host([${c.MEDIA_VOLUME_LEVEL}=off]) slot[name=tooltip-mute] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="off">${oy}</slot>
      <slot name="low">${Vh}</slot>
      <slot name="medium">${Vh}</slot>
      <slot name="high">${ly}</slot>
    </slot>
  `}function uy(){return`
    <slot name="tooltip-mute">${R("Mute")}</slot>
    <slot name="tooltip-unmute">${R("Unmute")}</slot>
  `}const qh=t=>{const e=t.mediaVolumeLevel==="off",i=R(e?"unmute":"mute");t.setAttribute("aria-label",i)};class zu extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_VOLUME_LEVEL]}connectedCallback(){super.connectedCallback(),qh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_VOLUME_LEVEL&&qh(this)}get mediaVolumeLevel(){return oe(this,c.MEDIA_VOLUME_LEVEL)}set mediaVolumeLevel(e){ae(this,c.MEDIA_VOLUME_LEVEL,e)}handleClick(){const e=this.mediaVolumeLevel==="off"?L.MEDIA_UNMUTE_REQUEST:L.MEDIA_MUTE_REQUEST;this.dispatchEvent(new _.CustomEvent(e,{composed:!0,bubbles:!0}))}}zu.getSlotTemplateHTML=dy;zu.getTooltipContentHTML=uy;_.customElements.get("media-mute-button")||_.customElements.define("media-mute-button",zu);const Yh=`<svg aria-hidden="true" viewBox="0 0 28 24">
  <path d="M24 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm-1 16H5V5h18v14Zm-3-8h-7v5h7v-5Z"/>
</svg>`;function cy(t){return`
    <style>
      :host([${c.MEDIA_IS_PIP}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      :host(:not([${c.MEDIA_IS_PIP}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${c.MEDIA_IS_PIP}]) slot[name=tooltip-enter],
      :host(:not([${c.MEDIA_IS_PIP}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${Yh}</slot>
      <slot name="exit">${Yh}</slot>
    </slot>
  `}function hy(){return`
    <slot name="tooltip-enter">${R("Enter picture in picture mode")}</slot>
    <slot name="tooltip-exit">${R("Exit picture in picture mode")}</slot>
  `}const Gh=t=>{const e=t.mediaIsPip?R("exit picture in picture mode"):R("enter picture in picture mode");t.setAttribute("aria-label",e)};class Qu extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_IS_PIP,c.MEDIA_PIP_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),Gh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_IS_PIP&&Gh(this)}get mediaPipUnavailable(){return oe(this,c.MEDIA_PIP_UNAVAILABLE)}set mediaPipUnavailable(e){ae(this,c.MEDIA_PIP_UNAVAILABLE,e)}get mediaIsPip(){return q(this,c.MEDIA_IS_PIP)}set mediaIsPip(e){Y(this,c.MEDIA_IS_PIP,e)}handleClick(){const e=this.mediaIsPip?L.MEDIA_EXIT_PIP_REQUEST:L.MEDIA_ENTER_PIP_REQUEST;this.dispatchEvent(new _.CustomEvent(e,{composed:!0,bubbles:!0}))}}Qu.getSlotTemplateHTML=cy;Qu.getTooltipContentHTML=hy;_.customElements.get("media-pip-button")||_.customElements.define("media-pip-button",Qu);var my=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},ya=(t,e,i)=>(my(t,e,"read from private field"),i?i.call(t):e.get(t)),py=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Si;const Dl={RATES:"rates"},Sv=[1,1.2,1.5,1.7,2],Xa=1;function Wi(t){return Math.round(t*100)/100}function vy(t){return`
    <style>
      :host {
        min-width: 5ch;
        padding: var(--media-button-padding, var(--media-control-padding, 10px 5px));
      }
    </style>
    <slot name="icon">${t.mediaplaybackrate?Wi(+t.mediaplaybackrate):Xa}x</slot>
  `}function fy(){return R("Playback rate")}class ju extends De{constructor(){var e;super(),py(this,Si,new Du(this,Dl.RATES,{defaultValue:Sv})),this.container=this.shadowRoot.querySelector('slot[name="icon"]'),this.container.innerHTML=`${Wi((e=this.mediaPlaybackRate)!=null?e:Xa)}x`}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PLAYBACK_RATE,Dl.RATES]}attributeChangedCallback(e,i,a){if(super.attributeChangedCallback(e,i,a),e===Dl.RATES&&(ya(this,Si).value=a),e===c.MEDIA_PLAYBACK_RATE){const r=a?+a:Number.NaN,n=Wi(Number.isNaN(r)?Xa:r);this.container.innerHTML=`${n}x`,this.setAttribute("aria-label",R("Playback rate {playbackRate}",{playbackRate:n}))}}get rates(){return ya(this,Si)}set rates(e){e?Array.isArray(e)?ya(this,Si).value=e.join(" "):typeof e=="string"&&(ya(this,Si).value=e):ya(this,Si).value=""}get mediaPlaybackRate(){return ie(this,c.MEDIA_PLAYBACK_RATE,Xa)}set mediaPlaybackRate(e){ce(this,c.MEDIA_PLAYBACK_RATE,e)}handleClick(){var e,i;const a=Array.from(ya(this,Si).values(),s=>+s).sort((s,o)=>s-o),r=(i=(e=a.find(s=>s>this.mediaPlaybackRate))!=null?e:a[0])!=null?i:Xa,n=new _.CustomEvent(L.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:r});this.dispatchEvent(n)}}Si=new WeakMap;ju.getSlotTemplateHTML=vy;ju.getTooltipContentHTML=fy;_.customElements.get("media-playback-rate-button")||_.customElements.define("media-playback-rate-button",ju);const Ey=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="m6 21 15-9L6 3v18Z"/>
</svg>`,_y=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M6 20h4V4H6v16Zm8-16v16h4V4h-4Z"/>
</svg>`;function by(t){return`
    <style>
      :host([${c.MEDIA_PAUSED}]) slot[name=pause],
      :host(:not([${c.MEDIA_PAUSED}])) slot[name=play] {
        display: none !important;
      }

      :host([${c.MEDIA_PAUSED}]) slot[name=tooltip-pause],
      :host(:not([${c.MEDIA_PAUSED}])) slot[name=tooltip-play] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="play">${Ey}</slot>
      <slot name="pause">${_y}</slot>
    </slot>
  `}function gy(){return`
    <slot name="tooltip-play">${R("Play")}</slot>
    <slot name="tooltip-pause">${R("Pause")}</slot>
  `}const zh=t=>{const e=t.mediaPaused?R("play"):R("pause");t.setAttribute("aria-label",e)};class Zu extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PAUSED,c.MEDIA_ENDED]}connectedCallback(){super.connectedCallback(),zh(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),(e===c.MEDIA_PAUSED||e===c.MEDIA_LANG)&&zh(this)}get mediaPaused(){return q(this,c.MEDIA_PAUSED)}set mediaPaused(e){Y(this,c.MEDIA_PAUSED,e)}handleClick(){const e=this.mediaPaused?L.MEDIA_PLAY_REQUEST:L.MEDIA_PAUSE_REQUEST;this.dispatchEvent(new _.CustomEvent(e,{composed:!0,bubbles:!0}))}}Zu.getSlotTemplateHTML=by;Zu.getTooltipContentHTML=gy;_.customElements.get("media-play-button")||_.customElements.define("media-play-button",Zu);const Lt={PLACEHOLDER_SRC:"placeholdersrc",SRC:"src"};function yy(t){return`
    <style>
      :host {
        pointer-events: none;
        display: var(--media-poster-image-display, inline-block);
        box-sizing: border-box;
      }

      img {
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
        min-height: 100%;
        background-repeat: no-repeat;
        background-position: var(--media-poster-image-background-position, var(--media-object-position, center));
        background-size: var(--media-poster-image-background-size, var(--media-object-fit, contain));
        object-fit: var(--media-object-fit, contain);
        object-position: var(--media-object-position, center);
      }
    </style>

    <img part="poster img" aria-hidden="true" id="image"/>
  `}const Ty=t=>{t.style.removeProperty("background-image")},Ay=(t,e)=>{t.style["background-image"]=`url('${e}')`};class Xu extends _.HTMLElement{static get observedAttributes(){return[Lt.PLACEHOLDER_SRC,Lt.SRC]}constructor(){if(super(),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}this.image=this.shadowRoot.querySelector("#image")}attributeChangedCallback(e,i,a){e===Lt.SRC&&(a==null?this.image.removeAttribute(Lt.SRC):this.image.setAttribute(Lt.SRC,a)),e===Lt.PLACEHOLDER_SRC&&(a==null?Ty(this.image):Ay(this.image,a))}get placeholderSrc(){return oe(this,Lt.PLACEHOLDER_SRC)}set placeholderSrc(e){ae(this,Lt.SRC,e)}get src(){return oe(this,Lt.SRC)}set src(e){ae(this,Lt.SRC,e)}}Xu.shadowRootOptions={mode:"open"};Xu.getTemplateHTML=yy;_.customElements.get("media-poster-image")||_.customElements.define("media-poster-image",Xu);var wv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},ky=(t,e,i)=>(wv(t,e,"read from private field"),i?i.call(t):e.get(t)),Sy=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},wy=(t,e,i,a)=>(wv(t,e,"write to private field"),e.set(t,i),i),Us;class Iy extends Fi{constructor(){super(),Sy(this,Us,void 0),wy(this,Us,this.shadowRoot.querySelector("slot"))}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PREVIEW_CHAPTER,c.MEDIA_LANG]}attributeChangedCallback(e,i,a){if(super.attributeChangedCallback(e,i,a),(e===c.MEDIA_PREVIEW_CHAPTER||e===c.MEDIA_LANG)&&a!==i&&a!=null)if(ky(this,Us).textContent=a,a!==""){const r=R("chapter: {chapterName}",{chapterName:a});this.setAttribute("aria-valuetext",r)}else this.removeAttribute("aria-valuetext")}get mediaPreviewChapter(){return oe(this,c.MEDIA_PREVIEW_CHAPTER)}set mediaPreviewChapter(e){ae(this,c.MEDIA_PREVIEW_CHAPTER,e)}}Us=new WeakMap;_.customElements.get("media-preview-chapter-display")||_.customElements.define("media-preview-chapter-display",Iy);var Iv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Jn=(t,e,i)=>(Iv(t,e,"read from private field"),i?i.call(t):e.get(t)),Ry=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},es=(t,e,i,a)=>(Iv(t,e,"write to private field"),e.set(t,i),i),Bt;function Ly(t){return`
    <style>
      :host {
        box-sizing: border-box;
        display: var(--media-control-display, var(--media-preview-thumbnail-display, inline-block));
        overflow: hidden;
      }

      img {
        display: none;
        position: relative;
      }
    </style>
    <img crossorigin loading="eager" decoding="async">
  `}class hl extends _.HTMLElement{constructor(){if(super(),Ry(this,Bt,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[Q.MEDIA_CONTROLLER,c.MEDIA_PREVIEW_IMAGE,c.MEDIA_PREVIEW_COORDS]}connectedCallback(){var e,i,a;const r=this.getAttribute(Q.MEDIA_CONTROLLER);r&&(es(this,Bt,(e=this.getRootNode())==null?void 0:e.getElementById(r)),(a=(i=Jn(this,Bt))==null?void 0:i.associateElement)==null||a.call(i,this))}disconnectedCallback(){var e,i;(i=(e=Jn(this,Bt))==null?void 0:e.unassociateElement)==null||i.call(e,this),es(this,Bt,null)}attributeChangedCallback(e,i,a){var r,n,s,o,l;[c.MEDIA_PREVIEW_IMAGE,c.MEDIA_PREVIEW_COORDS].includes(e)&&this.update(),e===Q.MEDIA_CONTROLLER&&(i&&((n=(r=Jn(this,Bt))==null?void 0:r.unassociateElement)==null||n.call(r,this),es(this,Bt,null)),a&&this.isConnected&&(es(this,Bt,(s=this.getRootNode())==null?void 0:s.getElementById(a)),(l=(o=Jn(this,Bt))==null?void 0:o.associateElement)==null||l.call(o,this)))}get mediaPreviewImage(){return oe(this,c.MEDIA_PREVIEW_IMAGE)}set mediaPreviewImage(e){ae(this,c.MEDIA_PREVIEW_IMAGE,e)}get mediaPreviewCoords(){const e=this.getAttribute(c.MEDIA_PREVIEW_COORDS);if(e)return e.split(/\s+/).map(i=>+i)}set mediaPreviewCoords(e){if(!e){this.removeAttribute(c.MEDIA_PREVIEW_COORDS);return}this.setAttribute(c.MEDIA_PREVIEW_COORDS,e.join(" "))}update(){const e=this.mediaPreviewCoords,i=this.mediaPreviewImage;if(!(e&&i))return;const[a,r,n,s]=e,o=i.split("#")[0],l=getComputedStyle(this),{maxWidth:u,maxHeight:m,minWidth:p,minHeight:h}=l,d=l.getPropertyValue("--media-preview-thumbnail-object-fit").trim()||"contain";let v,E;if(d==="fill"){const C=parseInt(u)/n,$=parseInt(m)/s,B=parseInt(p)/n,G=parseInt(h)/s;v=C<1?C:Math.max(C,B),E=$<1?$:Math.max($,G)}else{const C=Math.min(parseInt(u)/n,parseInt(m)/s),$=Math.max(parseInt(p)/n,parseInt(h)/s),G=C<1?C:$>1?$:1;v=G,E=G}const{style:b}=ke(this.shadowRoot,":host"),y=ke(this.shadowRoot,"img").style,T=this.shadowRoot.querySelector("img"),k=Math.min(v,E)<1?"min":"max";b.setProperty(`${k}-width`,"initial","important"),b.setProperty(`${k}-height`,"initial","important"),b.width=`${n*v}px`,b.height=`${s*E}px`;const D=()=>{y.width=`${this.imgWidth*v}px`,y.height=`${this.imgHeight*E}px`,y.display="block"};T.src!==o&&(T.onload=()=>{this.imgWidth=T.naturalWidth,this.imgHeight=T.naturalHeight,D(),T.onload=null},T.src=o,D()),D(),y.transform=`translate(-${a*v}px, -${r*E}px)`}}Bt=new WeakMap;hl.shadowRootOptions={mode:"open"};hl.getTemplateHTML=Ly;_.customElements.get("media-preview-thumbnail")||_.customElements.define("media-preview-thumbnail",hl);var Qh=hl,Rv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},jh=(t,e,i)=>(Rv(t,e,"read from private field"),i?i.call(t):e.get(t)),Cy=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Dy=(t,e,i,a)=>(Rv(t,e,"write to private field"),e.set(t,i),i),jr;class My extends Fi{constructor(){super(),Cy(this,jr,void 0),Dy(this,jr,this.shadowRoot.querySelector("slot")),jh(this,jr).textContent=Bi(0)}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PREVIEW_TIME]}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_PREVIEW_TIME&&a!=null&&(jh(this,jr).textContent=Bi(parseFloat(a)))}get mediaPreviewTime(){return ie(this,c.MEDIA_PREVIEW_TIME)}set mediaPreviewTime(e){ce(this,c.MEDIA_PREVIEW_TIME,e)}}jr=new WeakMap;_.customElements.get("media-preview-time-display")||_.customElements.define("media-preview-time-display",My);const Ta={SEEK_OFFSET:"seekoffset"},Ml=30,Oy=t=>`
  <svg aria-hidden="true" viewBox="0 0 20 24">
    <defs>
      <style>.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}</style>
    </defs>
    <text class="text value" transform="translate(2.18 19.87)">${t}</text>
    <path d="M10 6V3L4.37 7 10 10.94V8a5.54 5.54 0 0 1 1.9 10.48v2.12A7.5 7.5 0 0 0 10 6Z"/>
  </svg>`;function xy(t,e){return`
    <slot name="icon">${Oy(e.seekOffset)}</slot>
  `}const Ny=(t,e)=>{t.setAttribute("aria-label",R("seek back {seekOffset} seconds",{seekOffset:e}))};function Py(){return R("Seek backward")}const $y=0;class Ju extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_CURRENT_TIME,Ta.SEEK_OFFSET]}connectedCallback(){super.connectedCallback(),this.seekOffset=ie(this,Ta.SEEK_OFFSET,Ml)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),Ny(this,this.seekOffset),e===Ta.SEEK_OFFSET&&(this.seekOffset=ie(this,Ta.SEEK_OFFSET,Ml))}get seekOffset(){return ie(this,Ta.SEEK_OFFSET,Ml)}set seekOffset(e){ce(this,Ta.SEEK_OFFSET,e),this.setAttribute("aria-label",R("seek back {seekOffset} seconds",{seekOffset:this.seekOffset})),Pp($p(this,"icon"),this.seekOffset)}get mediaCurrentTime(){return ie(this,c.MEDIA_CURRENT_TIME,$y)}set mediaCurrentTime(e){ce(this,c.MEDIA_CURRENT_TIME,e)}handleClick(){const e=Math.max(this.mediaCurrentTime-this.seekOffset,0),i=new _.CustomEvent(L.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(i)}}Ju.getSlotTemplateHTML=xy;Ju.getTooltipContentHTML=Py;_.customElements.get("media-seek-backward-button")||_.customElements.define("media-seek-backward-button",Ju);const Aa={SEEK_OFFSET:"seekoffset"},Ol=30,Uy=t=>`
  <svg aria-hidden="true" viewBox="0 0 20 24">
    <defs>
      <style>.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}</style>
    </defs>
    <text class="text value" transform="translate(8.9 19.87)">${t}</text>
    <path d="M10 6V3l5.61 4L10 10.94V8a5.54 5.54 0 0 0-1.9 10.48v2.12A7.5 7.5 0 0 1 10 6Z"/>
  </svg>`;function Hy(t,e){return`
    <slot name="icon">${Uy(e.seekOffset)}</slot>
  `}const By=(t,e)=>{t.setAttribute("aria-label",R("seek forward {seekOffset} seconds",{seekOffset:e}))};function Wy(){return R("Seek forward")}const Fy=0;class ec extends De{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_CURRENT_TIME,Aa.SEEK_OFFSET]}connectedCallback(){super.connectedCallback(),this.seekOffset=ie(this,Aa.SEEK_OFFSET,Ol)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),By(this,this.seekOffset),e===Aa.SEEK_OFFSET&&(this.seekOffset=ie(this,Aa.SEEK_OFFSET,Ol))}get seekOffset(){return ie(this,Aa.SEEK_OFFSET,Ol)}set seekOffset(e){ce(this,Aa.SEEK_OFFSET,e),this.setAttribute("aria-label",R("seek forward {seekOffset} seconds",{seekOffset:this.seekOffset})),Pp($p(this,"icon"),this.seekOffset)}get mediaCurrentTime(){return ie(this,c.MEDIA_CURRENT_TIME,Fy)}set mediaCurrentTime(e){ce(this,c.MEDIA_CURRENT_TIME,e)}handleClick(){const e=this.mediaCurrentTime+this.seekOffset,i=new _.CustomEvent(L.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(i)}}ec.getSlotTemplateHTML=Hy;ec.getTooltipContentHTML=Wy;_.customElements.get("media-seek-forward-button")||_.customElements.define("media-seek-forward-button",ec);var tc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},St=(t,e,i)=>(tc(t,e,"read from private field"),i?i.call(t):e.get(t)),zi=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},ic=(t,e,i,a)=>(tc(t,e,"write to private field"),e.set(t,i),i),Di=(t,e,i)=>(tc(t,e,"access private method"),i),xa,Zt,ml,ac,Lv,Do,rc,Zr,Hs,Bs,kd;const wi={REMAINING:"remaining",SHOW_DURATION:"showduration",NO_TOGGLE:"notoggle"},Zh=[...Object.values(wi),c.MEDIA_CURRENT_TIME,c.MEDIA_DURATION,c.MEDIA_SEEKABLE],Cv=["Enter"," "],Ky="&nbsp;/&nbsp;",Sd=(t,{timesSep:e=Ky}={})=>{var i,a;const r=(i=t.mediaCurrentTime)!=null?i:0,[,n]=(a=t.mediaSeekable)!=null?a:[];let s=0;Number.isFinite(t.mediaDuration)?s=t.mediaDuration:Number.isFinite(n)&&(s=n);const o=t.remaining?Bi(0-(s-r)):Bi(r);return t.showDuration?`${o}${e}${Bi(s)}`:o},Vy=t=>{var e;const i=t.mediaCurrentTime,[,a]=(e=t.mediaSeekable)!=null?e:[];let r=null;if(Number.isFinite(t.mediaDuration)?r=t.mediaDuration:Number.isFinite(a)&&(r=a),i==null||r===null){t.setAttribute("aria-description",R("video not loaded, unknown time."));return}const n=t.remaining?hn(0-(r-i)):hn(i);if(!t.showDuration){t.setAttribute("aria-description",n);return}const s=hn(r),o=R("{currentTime} of {totalTime}",{currentTime:n,totalTime:s});t.setAttribute("aria-description",o)};function qy(t,e){return`
    <slot>${Sd(e)}</slot>
  `}const Yy=t=>{t.setAttribute("aria-label",R("playback time"))};class Dv extends Fi{constructor(){super(),zi(this,ac),zi(this,Do),zi(this,Zr),zi(this,Bs),zi(this,xa,void 0),zi(this,Zt,null),zi(this,ml,e=>{const{metaKey:i,altKey:a,key:r}=e;if(i||a||!Cv.includes(r)){this.removeEventListener("keyup",St(this,Zt));return}this.addEventListener("keyup",St(this,Zt))}),ic(this,xa,this.shadowRoot.querySelector("slot")),St(this,xa).innerHTML=`${Sd(this)}`}static get observedAttributes(){return[...super.observedAttributes,...Zh,"disabled"]}connectedCallback(){const{style:e}=ke(this.shadowRoot,":host(:hover:not([notoggle]))");e.setProperty("cursor","var(--media-cursor, pointer)"),e.setProperty("background","var(--media-control-hover-background, rgba(50 50 70 / .7))"),this.setAttribute("aria-label",R("playback time")),Di(this,Zr,Hs).call(this),super.connectedCallback()}toggleTimeDisplay(){this.noToggle||(this.hasAttribute("remaining")?this.removeAttribute("remaining"):this.setAttribute("remaining",""))}disconnectedCallback(){this.disable(),Di(this,Do,rc).call(this),super.disconnectedCallback()}attributeChangedCallback(e,i,a){Yy(this),Zh.includes(e)?this.update():e==="disabled"&&a!==i?a==null?Di(this,Zr,Hs).call(this):Di(this,Bs,kd).call(this):e===wi.NO_TOGGLE&&a!==i&&(this.noToggle?Di(this,Bs,kd).call(this):Di(this,Zr,Hs).call(this)),super.attributeChangedCallback(e,i,a)}enable(){this.noToggle||(this.tabIndex=0)}disable(){this.tabIndex=-1}get remaining(){return q(this,wi.REMAINING)}set remaining(e){Y(this,wi.REMAINING,e)}get showDuration(){return q(this,wi.SHOW_DURATION)}set showDuration(e){Y(this,wi.SHOW_DURATION,e)}get noToggle(){return q(this,wi.NO_TOGGLE)}set noToggle(e){Y(this,wi.NO_TOGGLE,e)}get mediaDuration(){return ie(this,c.MEDIA_DURATION)}set mediaDuration(e){ce(this,c.MEDIA_DURATION,e)}get mediaCurrentTime(){return ie(this,c.MEDIA_CURRENT_TIME)}set mediaCurrentTime(e){ce(this,c.MEDIA_CURRENT_TIME,e)}get mediaSeekable(){const e=this.getAttribute(c.MEDIA_SEEKABLE);if(e)return e.split(":").map(i=>+i)}set mediaSeekable(e){if(e==null){this.removeAttribute(c.MEDIA_SEEKABLE);return}this.setAttribute(c.MEDIA_SEEKABLE,e.join(":"))}update(){const e=Sd(this);Vy(this),e!==St(this,xa).innerHTML&&(St(this,xa).innerHTML=e)}}xa=new WeakMap;Zt=new WeakMap;ml=new WeakMap;ac=new WeakSet;Lv=function(){St(this,Zt)||(ic(this,Zt,t=>{const{key:e}=t;if(!Cv.includes(e)){this.removeEventListener("keyup",St(this,Zt));return}this.toggleTimeDisplay()}),this.addEventListener("keydown",St(this,ml)),this.addEventListener("click",this.toggleTimeDisplay))};Do=new WeakSet;rc=function(){St(this,Zt)&&(this.removeEventListener("keyup",St(this,Zt)),this.removeEventListener("keydown",St(this,ml)),this.removeEventListener("click",this.toggleTimeDisplay),ic(this,Zt,null))};Zr=new WeakSet;Hs=function(){!this.noToggle&&!this.hasAttribute("disabled")&&(this.setAttribute("role","button"),this.enable(),Di(this,ac,Lv).call(this))};Bs=new WeakSet;kd=function(){this.removeAttribute("role"),this.disable(),Di(this,Do,rc).call(this)};Dv.getSlotTemplateHTML=qy;_.customElements.get("media-time-display")||_.customElements.define("media-time-display",Dv);var Mv=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Re=(t,e,i)=>(Mv(t,e,"read from private field"),e.get(t)),Ct=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Je=(t,e,i,a)=>(Mv(t,e,"write to private field"),e.set(t,i),i),Gy=(t,e,i,a)=>({set _(r){Je(t,e,r)},get _(){return Re(t,e)}}),Na,Ws,Pa,Xr,Fs,Ks,Vs,$a,Ji,qs;class zy{constructor(e,i,a){Ct(this,Na,void 0),Ct(this,Ws,void 0),Ct(this,Pa,void 0),Ct(this,Xr,void 0),Ct(this,Fs,void 0),Ct(this,Ks,void 0),Ct(this,Vs,void 0),Ct(this,$a,void 0),Ct(this,Ji,0),Ct(this,qs,(r=performance.now())=>{Je(this,Ji,requestAnimationFrame(Re(this,qs))),Je(this,Xr,performance.now()-Re(this,Pa));const n=1e3/this.fps;if(Re(this,Xr)>n){Je(this,Pa,r-Re(this,Xr)%n);const s=1e3/((r-Re(this,Ws))/++Gy(this,Fs)._),o=(r-Re(this,Ks))/1e3/this.duration;let l=Re(this,Vs)+o*this.playbackRate;l-Re(this,Na).valueAsNumber>0?Je(this,$a,this.playbackRate/this.duration/s):(Je(this,$a,.995*Re(this,$a)),l=Re(this,Na).valueAsNumber+Re(this,$a)),this.callback(l)}}),Je(this,Na,e),this.callback=i,this.fps=a}start(){Re(this,Ji)===0&&(Je(this,Pa,performance.now()),Je(this,Ws,Re(this,Pa)),Je(this,Fs,0),Re(this,qs).call(this))}stop(){Re(this,Ji)!==0&&(cancelAnimationFrame(Re(this,Ji)),Je(this,Ji,0))}update({start:e,duration:i,playbackRate:a}){const r=e-Re(this,Na).valueAsNumber,n=Math.abs(i-this.duration);(r>0||r<-.03||n>=.5)&&this.callback(e),Je(this,Vs,e),Je(this,Ks,performance.now()),this.duration=i,this.playbackRate=a}}Na=new WeakMap;Ws=new WeakMap;Pa=new WeakMap;Xr=new WeakMap;Fs=new WeakMap;Ks=new WeakMap;Vs=new WeakMap;$a=new WeakMap;Ji=new WeakMap;qs=new WeakMap;var nc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},ne=(t,e,i)=>(nc(t,e,"read from private field"),i?i.call(t):e.get(t)),Te=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},st=(t,e,i,a)=>(nc(t,e,"write to private field"),e.set(t,i),i),dt=(t,e,i)=>(nc(t,e,"access private method"),i),Ua,Mi,Mo,vn,Oo,Ys,Mn,On,Ha,Ba,Jr,wd,Ov,Id,xo,sc,No,oc,Po,lc,Rd,xv,xn,$o,Ld,Nv;const Qy=t=>{const e=t.range,i=hn(+Pv(t)),a=hn(+t.mediaSeekableEnd),r=i&&a?R("{currentTime} of {totalTime}",{currentTime:i,totalTime:a}):R("video not loaded, unknown time.");e.setAttribute("aria-valuetext",r)};function jy(t){return`
    <style>
      :host {
        --media-box-border-radius: 4px;
        --media-box-padding-left: 10px;
        --media-box-padding-right: 10px;
        --media-preview-border-radius: var(--media-box-border-radius);
        --media-box-arrow-offset: var(--media-box-border-radius);
        --_control-background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        --_preview-background: var(--media-preview-background, var(--_control-background));

        
        contain: layout;
      }

      #buffered {
        background: var(--media-time-range-buffered-color, rgb(255 255 255 / .4));
        position: absolute;
        height: 100%;
        will-change: width;
      }

      #preview-rail,
      #current-rail {
        width: 100%;
        position: absolute;
        left: 0;
        bottom: 100%;
        pointer-events: none;
        will-change: transform;
      }

      [part~="box"] {
        width: min-content;
        
        position: absolute;
        bottom: 100%;
        flex-direction: column;
        align-items: center;
        transform: translateX(-50%);
      }

      [part~="current-box"] {
        display: var(--media-current-box-display, var(--media-box-display, flex));
        margin: var(--media-current-box-margin, var(--media-box-margin, 0 0 5px));
        visibility: hidden;
      }

      [part~="preview-box"] {
        display: var(--media-preview-box-display, var(--media-box-display, flex));
        margin: var(--media-preview-box-margin, var(--media-box-margin, 0 0 5px));
        transition-property: var(--media-preview-transition-property, visibility, opacity);
        transition-duration: var(--media-preview-transition-duration-out, .25s);
        transition-delay: var(--media-preview-transition-delay-out, 0s);
        visibility: hidden;
        opacity: 0;
      }

      :host(:is([${c.MEDIA_PREVIEW_IMAGE}], [${c.MEDIA_PREVIEW_TIME}])[dragging]) [part~="preview-box"] {
        transition-duration: var(--media-preview-transition-duration-in, .5s);
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        visibility: visible;
        opacity: 1;
      }

      @media (hover: hover) {
        :host(:is([${c.MEDIA_PREVIEW_IMAGE}], [${c.MEDIA_PREVIEW_TIME}]):hover) [part~="preview-box"] {
          transition-duration: var(--media-preview-transition-duration-in, .5s);
          transition-delay: var(--media-preview-transition-delay-in, .25s);
          visibility: visible;
          opacity: 1;
        }
      }

      media-preview-thumbnail,
      ::slotted(media-preview-thumbnail) {
        visibility: hidden;
        
        transition: visibility 0s .25s;
        transition-delay: calc(var(--media-preview-transition-delay-out, 0s) + var(--media-preview-transition-duration-out, .25s));
        background: var(--media-preview-thumbnail-background, var(--_preview-background));
        box-shadow: var(--media-preview-thumbnail-box-shadow, 0 0 4px rgb(0 0 0 / .2));
        max-width: var(--media-preview-thumbnail-max-width, 180px);
        max-height: var(--media-preview-thumbnail-max-height, 160px);
        min-width: var(--media-preview-thumbnail-min-width, 120px);
        min-height: var(--media-preview-thumbnail-min-height, 80px);
        border: var(--media-preview-thumbnail-border);
        border-radius: var(--media-preview-thumbnail-border-radius,
          var(--media-preview-border-radius) var(--media-preview-border-radius) 0 0);
      }

      :host([${c.MEDIA_PREVIEW_IMAGE}][dragging]) media-preview-thumbnail,
      :host([${c.MEDIA_PREVIEW_IMAGE}][dragging]) ::slotted(media-preview-thumbnail) {
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        visibility: visible;
      }

      @media (hover: hover) {
        :host([${c.MEDIA_PREVIEW_IMAGE}]:hover) media-preview-thumbnail,
        :host([${c.MEDIA_PREVIEW_IMAGE}]:hover) ::slotted(media-preview-thumbnail) {
          transition-delay: var(--media-preview-transition-delay-in, .25s);
          visibility: visible;
        }

        :host([${c.MEDIA_PREVIEW_TIME}]:hover) {
          --media-time-range-hover-display: block;
        }
      }

      media-preview-chapter-display,
      ::slotted(media-preview-chapter-display) {
        font-size: var(--media-font-size, 13px);
        line-height: 17px;
        min-width: 0;
        visibility: hidden;
        
        transition: min-width 0s, border-radius 0s, margin 0s, padding 0s, visibility 0s;
        transition-delay: calc(var(--media-preview-transition-delay-out, 0s) + var(--media-preview-transition-duration-out, .25s));
        background: var(--media-preview-chapter-background, var(--_preview-background));
        border-radius: var(--media-preview-chapter-border-radius,
          var(--media-preview-border-radius) var(--media-preview-border-radius)
          var(--media-preview-border-radius) var(--media-preview-border-radius));
        padding: var(--media-preview-chapter-padding, 3.5px 9px);
        margin: var(--media-preview-chapter-margin, 0 0 5px);
        text-shadow: var(--media-preview-chapter-text-shadow, 0 0 4px rgb(0 0 0 / .75));
      }

      :host([${c.MEDIA_PREVIEW_IMAGE}]) media-preview-chapter-display,
      :host([${c.MEDIA_PREVIEW_IMAGE}]) ::slotted(media-preview-chapter-display) {
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        border-radius: var(--media-preview-chapter-border-radius, 0);
        padding: var(--media-preview-chapter-padding, 3.5px 9px 0);
        margin: var(--media-preview-chapter-margin, 0);
        min-width: 100%;
      }

      media-preview-chapter-display[${c.MEDIA_PREVIEW_CHAPTER}],
      ::slotted(media-preview-chapter-display[${c.MEDIA_PREVIEW_CHAPTER}]) {
        visibility: visible;
      }

      media-preview-chapter-display:not([aria-valuetext]),
      ::slotted(media-preview-chapter-display:not([aria-valuetext])) {
        display: none;
      }

      media-preview-time-display,
      ::slotted(media-preview-time-display),
      media-time-display,
      ::slotted(media-time-display) {
        font-size: var(--media-font-size, 13px);
        line-height: 17px;
        min-width: 0;
        
        transition: min-width 0s, border-radius 0s;
        transition-delay: calc(var(--media-preview-transition-delay-out, 0s) + var(--media-preview-transition-duration-out, .25s));
        background: var(--media-preview-time-background, var(--_preview-background));
        border-radius: var(--media-preview-time-border-radius,
          var(--media-preview-border-radius) var(--media-preview-border-radius)
          var(--media-preview-border-radius) var(--media-preview-border-radius));
        padding: var(--media-preview-time-padding, 3.5px 9px);
        margin: var(--media-preview-time-margin, 0);
        text-shadow: var(--media-preview-time-text-shadow, 0 0 4px rgb(0 0 0 / .75));
        transform: translateX(min(
          max(calc(50% - var(--_box-width) / 2),
          calc(var(--_box-shift, 0))),
          calc(var(--_box-width) / 2 - 50%)
        ));
      }

      :host([${c.MEDIA_PREVIEW_IMAGE}]) media-preview-time-display,
      :host([${c.MEDIA_PREVIEW_IMAGE}]) ::slotted(media-preview-time-display) {
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        border-radius: var(--media-preview-time-border-radius,
          0 0 var(--media-preview-border-radius) var(--media-preview-border-radius));
        min-width: 100%;
      }

      :host([${c.MEDIA_PREVIEW_TIME}]:hover) {
        --media-time-range-hover-display: block;
      }

      [part~="arrow"],
      ::slotted([part~="arrow"]) {
        display: var(--media-box-arrow-display, inline-block);
        transform: translateX(min(
          max(calc(50% - var(--_box-width) / 2 + var(--media-box-arrow-offset)),
          calc(var(--_box-shift, 0))),
          calc(var(--_box-width) / 2 - 50% - var(--media-box-arrow-offset))
        ));
        
        border-color: transparent;
        border-top-color: var(--media-box-arrow-background, var(--_control-background));
        border-width: var(--media-box-arrow-border-width,
          var(--media-box-arrow-height, 5px) var(--media-box-arrow-width, 6px) 0);
        border-style: solid;
        justify-content: center;
        height: 0;
      }
    </style>
    <div id="preview-rail">
      <slot name="preview" part="box preview-box">
        <media-preview-thumbnail>
          <template shadowrootmode="${Qh.shadowRootOptions.mode}">
            ${Qh.getTemplateHTML({})}
          </template>
        </media-preview-thumbnail>
        <media-preview-chapter-display></media-preview-chapter-display>
        <media-preview-time-display></media-preview-time-display>
        <slot name="preview-arrow"><div part="arrow"></div></slot>
      </slot>
    </div>
    <div id="current-rail">
      <slot name="current" part="box current-box">
        
      </slot>
    </div>
  `}const ts=(t,e=t.mediaCurrentTime)=>{const i=Number.isFinite(t.mediaSeekableStart)?t.mediaSeekableStart:0,a=Number.isFinite(t.mediaDuration)?t.mediaDuration:t.mediaSeekableEnd;if(Number.isNaN(a))return 0;const r=(e-i)/(a-i);return Math.max(0,Math.min(r,1))},Pv=(t,e=t.range.valueAsNumber)=>{const i=Number.isFinite(t.mediaSeekableStart)?t.mediaSeekableStart:0,a=Number.isFinite(t.mediaDuration)?t.mediaDuration:t.mediaSeekableEnd;return Number.isNaN(a)?0:e*(a-i)+i};class dc extends gr{constructor(){super(),Te(this,wd),Te(this,xo),Te(this,No),Te(this,Po),Te(this,Rd),Te(this,xn),Te(this,Ld),Te(this,Ua,null),Te(this,Mi,void 0),Te(this,Mo,void 0),Te(this,vn,void 0),Te(this,Oo,void 0),Te(this,Ys,void 0),Te(this,Mn,void 0),Te(this,On,void 0),Te(this,Ha,void 0),Te(this,Ba,void 0),Te(this,Jr,()=>{dt(this,wd,Ov).call(this)?ne(this,Mi).start():ne(this,Mi).stop()}),Te(this,Id,a=>{this.dragging||(Su(a)&&(this.range.valueAsNumber=a),ne(this,Ba)||this.updateBar())}),this.shadowRoot.querySelector("#track").insertAdjacentHTML("afterbegin",'<div id="buffered" part="buffered"></div>'),st(this,Mo,this.shadowRoot.querySelectorAll('[part~="box"]')),st(this,Oo,this.shadowRoot.querySelector('[part~="preview-box"]')),st(this,Ys,this.shadowRoot.querySelector('[part~="current-box"]'));const i=getComputedStyle(this);st(this,Mn,parseInt(i.getPropertyValue("--media-box-padding-left"))),st(this,On,parseInt(i.getPropertyValue("--media-box-padding-right"))),st(this,Mi,new zy(this.range,ne(this,Id),60))}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PAUSED,c.MEDIA_DURATION,c.MEDIA_SEEKABLE,c.MEDIA_CURRENT_TIME,c.MEDIA_PREVIEW_IMAGE,c.MEDIA_PREVIEW_TIME,c.MEDIA_PREVIEW_CHAPTER,c.MEDIA_BUFFERED,c.MEDIA_PLAYBACK_RATE,c.MEDIA_LOADING,c.MEDIA_ENDED]}connectedCallback(){var e;super.connectedCallback(),this.range.setAttribute("aria-label",R("seek")),ne(this,Jr).call(this),st(this,Ua,this.getRootNode()),(e=ne(this,Ua))==null||e.addEventListener("transitionstart",this)}disconnectedCallback(){var e;super.disconnectedCallback(),ne(this,Mi).stop(),(e=ne(this,Ua))==null||e.removeEventListener("transitionstart",this),st(this,Ua,null)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),i!=a&&(e===c.MEDIA_CURRENT_TIME||e===c.MEDIA_PAUSED||e===c.MEDIA_ENDED||e===c.MEDIA_LOADING||e===c.MEDIA_DURATION||e===c.MEDIA_SEEKABLE?(ne(this,Mi).update({start:ts(this),duration:this.mediaSeekableEnd-this.mediaSeekableStart,playbackRate:this.mediaPlaybackRate}),ne(this,Jr).call(this),Qy(this)):e===c.MEDIA_BUFFERED&&this.updateBufferedBar(),(e===c.MEDIA_DURATION||e===c.MEDIA_SEEKABLE)&&(this.mediaChaptersCues=ne(this,Ha),this.updateBar()))}get mediaChaptersCues(){return ne(this,Ha)}set mediaChaptersCues(e){var i;st(this,Ha,e),this.updateSegments((i=ne(this,Ha))==null?void 0:i.map(a=>({start:ts(this,a.startTime),end:ts(this,a.endTime)})))}get mediaPaused(){return q(this,c.MEDIA_PAUSED)}set mediaPaused(e){Y(this,c.MEDIA_PAUSED,e)}get mediaLoading(){return q(this,c.MEDIA_LOADING)}set mediaLoading(e){Y(this,c.MEDIA_LOADING,e)}get mediaDuration(){return ie(this,c.MEDIA_DURATION)}set mediaDuration(e){ce(this,c.MEDIA_DURATION,e)}get mediaCurrentTime(){return ie(this,c.MEDIA_CURRENT_TIME)}set mediaCurrentTime(e){ce(this,c.MEDIA_CURRENT_TIME,e)}get mediaPlaybackRate(){return ie(this,c.MEDIA_PLAYBACK_RATE,1)}set mediaPlaybackRate(e){ce(this,c.MEDIA_PLAYBACK_RATE,e)}get mediaBuffered(){const e=this.getAttribute(c.MEDIA_BUFFERED);return e?e.split(" ").map(i=>i.split(":").map(a=>+a)):[]}set mediaBuffered(e){if(!e){this.removeAttribute(c.MEDIA_BUFFERED);return}const i=e.map(a=>a.join(":")).join(" ");this.setAttribute(c.MEDIA_BUFFERED,i)}get mediaSeekable(){const e=this.getAttribute(c.MEDIA_SEEKABLE);if(e)return e.split(":").map(i=>+i)}set mediaSeekable(e){if(e==null){this.removeAttribute(c.MEDIA_SEEKABLE);return}this.setAttribute(c.MEDIA_SEEKABLE,e.join(":"))}get mediaSeekableEnd(){var e;const[,i=this.mediaDuration]=(e=this.mediaSeekable)!=null?e:[];return i}get mediaSeekableStart(){var e;const[i=0]=(e=this.mediaSeekable)!=null?e:[];return i}get mediaPreviewImage(){return oe(this,c.MEDIA_PREVIEW_IMAGE)}set mediaPreviewImage(e){ae(this,c.MEDIA_PREVIEW_IMAGE,e)}get mediaPreviewTime(){return ie(this,c.MEDIA_PREVIEW_TIME)}set mediaPreviewTime(e){ce(this,c.MEDIA_PREVIEW_TIME,e)}get mediaEnded(){return q(this,c.MEDIA_ENDED)}set mediaEnded(e){Y(this,c.MEDIA_ENDED,e)}updateBar(){super.updateBar(),this.updateBufferedBar(),this.updateCurrentBox()}updateBufferedBar(){var e;const i=this.mediaBuffered;if(!i.length)return;let a;if(this.mediaEnded)a=1;else{const n=this.mediaCurrentTime,[,s=this.mediaSeekableStart]=(e=i.find(([o,l])=>o<=n&&n<=l))!=null?e:[];a=ts(this,s)}const{style:r}=ke(this.shadowRoot,"#buffered");r.setProperty("width",`${a*100}%`)}updateCurrentBox(){if(!this.shadowRoot.querySelector('slot[name="current"]').assignedElements().length)return;const i=ke(this.shadowRoot,"#current-rail"),a=ke(this.shadowRoot,'[part~="current-box"]'),r=dt(this,xo,sc).call(this,ne(this,Ys)),n=dt(this,No,oc).call(this,r,this.range.valueAsNumber),s=dt(this,Po,lc).call(this,r,this.range.valueAsNumber);i.style.transform=`translateX(${n})`,i.style.setProperty("--_range-width",`${r.range.width}`),a.style.setProperty("--_box-shift",`${s}`),a.style.setProperty("--_box-width",`${r.box.width}px`),a.style.setProperty("visibility","initial")}handleEvent(e){switch(super.handleEvent(e),e.type){case"input":dt(this,Ld,Nv).call(this);break;case"pointermove":dt(this,Rd,xv).call(this,e);break;case"pointerup":ne(this,Ba)&&st(this,Ba,!1);break;case"pointerdown":st(this,Ba,!0);break;case"pointerleave":dt(this,xn,$o).call(this,null);break;case"transitionstart":_i(e.target,this)&&setTimeout(()=>ne(this,Jr).call(this),0);break}}}Ua=new WeakMap;Mi=new WeakMap;Mo=new WeakMap;vn=new WeakMap;Oo=new WeakMap;Ys=new WeakMap;Mn=new WeakMap;On=new WeakMap;Ha=new WeakMap;Ba=new WeakMap;Jr=new WeakMap;wd=new WeakSet;Ov=function(){return this.isConnected&&!this.mediaPaused&&!this.mediaLoading&&!this.mediaEnded&&this.mediaSeekableEnd>0&&Up(this)};Id=new WeakMap;xo=new WeakSet;sc=function(t){var e;const a=((e=this.getAttribute("bounds")?_r(this,`#${this.getAttribute("bounds")}`):this.parentElement)!=null?e:this).getBoundingClientRect(),r=this.range.getBoundingClientRect(),n=t.offsetWidth,s=-(r.left-a.left-n/2),o=a.right-r.left-n/2;return{box:{width:n,min:s,max:o},bounds:a,range:r}};No=new WeakSet;oc=function(t,e){let i=`${e*100}%`;const{width:a,min:r,max:n}=t.box;if(!a)return i;if(Number.isNaN(r)||(i=`max(${`calc(1 / var(--_range-width) * 100 * ${r}% + var(--media-box-padding-left))`}, ${i})`),!Number.isNaN(n)){const o=`calc(1 / var(--_range-width) * 100 * ${n}% - var(--media-box-padding-right))`;i=`min(${i}, ${o})`}return i};Po=new WeakSet;lc=function(t,e){const{width:i,min:a,max:r}=t.box,n=e*t.range.width;if(n<a+ne(this,Mn)){const s=t.range.left-t.bounds.left-ne(this,Mn);return`${n-i/2+s}px`}if(n>r-ne(this,On)){const s=t.bounds.right-t.range.right-ne(this,On);return`${n+i/2-s-t.range.width}px`}return 0};Rd=new WeakSet;xv=function(t){const e=[...ne(this,Mo)].some(m=>t.composedPath().includes(m));if(!this.dragging&&(e||!t.composedPath().includes(this))){dt(this,xn,$o).call(this,null);return}const i=this.mediaSeekableEnd;if(!i)return;const a=ke(this.shadowRoot,"#preview-rail"),r=ke(this.shadowRoot,'[part~="preview-box"]'),n=dt(this,xo,sc).call(this,ne(this,Oo));let s=(t.clientX-n.range.left)/n.range.width;s=Math.max(0,Math.min(1,s));const o=dt(this,No,oc).call(this,n,s),l=dt(this,Po,lc).call(this,n,s);a.style.transform=`translateX(${o})`,a.style.setProperty("--_range-width",`${n.range.width}`),r.style.setProperty("--_box-shift",`${l}`),r.style.setProperty("--_box-width",`${n.box.width}px`);const u=Math.round(ne(this,vn))-Math.round(s*i);Math.abs(u)<1&&s>.01&&s<.99||(st(this,vn,s*i),dt(this,xn,$o).call(this,ne(this,vn)))};xn=new WeakSet;$o=function(t){this.dispatchEvent(new _.CustomEvent(L.MEDIA_PREVIEW_REQUEST,{composed:!0,bubbles:!0,detail:t}))};Ld=new WeakSet;Nv=function(){ne(this,Mi).stop();const t=Pv(this);this.dispatchEvent(new _.CustomEvent(L.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:t}))};dc.shadowRootOptions={mode:"open"};dc.getContainerTemplateHTML=jy;_.customElements.get("media-time-range")||_.customElements.define("media-time-range",dc);var Zy=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Xh=(t,e,i)=>(Zy(t,e,"read from private field"),i?i.call(t):e.get(t)),Xy=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Gs;const Jy=1,eT=t=>t.mediaMuted?0:t.mediaVolume,tT=t=>`${Math.round(t*100)}%`;class iT extends gr{constructor(){super(...arguments),Xy(this,Gs,()=>{const e=this.range.value,i=new _.CustomEvent(L.MEDIA_VOLUME_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(i)})}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_VOLUME,c.MEDIA_MUTED,c.MEDIA_VOLUME_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),this.range.setAttribute("aria-label",R("volume")),this.range.addEventListener("input",Xh(this,Gs))}disconnectedCallback(){this.range.removeEventListener("input",Xh(this,Gs)),super.disconnectedCallback()}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),(e===c.MEDIA_VOLUME||e===c.MEDIA_MUTED)&&(this.range.valueAsNumber=eT(this),this.range.setAttribute("aria-valuetext",tT(this.range.valueAsNumber)),this.updateBar())}get mediaVolume(){return ie(this,c.MEDIA_VOLUME,Jy)}set mediaVolume(e){ce(this,c.MEDIA_VOLUME,e)}get mediaMuted(){return q(this,c.MEDIA_MUTED)}set mediaMuted(e){Y(this,c.MEDIA_MUTED,e)}get mediaVolumeUnavailable(){return oe(this,c.MEDIA_VOLUME_UNAVAILABLE)}set mediaVolumeUnavailable(e){ae(this,c.MEDIA_VOLUME_UNAVAILABLE,e)}}Gs=new WeakMap;_.customElements.get("media-volume-range")||_.customElements.define("media-volume-range",iT);function aT(t){return`
      <style>
        :host {
          min-width: 4ch;
          padding: var(--media-button-padding, var(--media-control-padding, 10px 5px));
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          font-weight: var(--media-button-font-weight, normal);
        }

        #checked-indicator {
          display: none;
        }

        :host([${c.MEDIA_LOOP}]) #checked-indicator {
          display: block;
        }
      </style>
      
      <span id="icon">
     </span>

      <div id="checked-indicator">
        <svg aria-hidden="true" viewBox="0 1 24 24" part="checked-indicator indicator">
          <path d="m10 15.17 9.193-9.191 1.414 1.414-10.606 10.606-6.364-6.364 1.414-1.414 4.95 4.95Z"/>
        </svg>
      </div>
    `}function rT(){return R("Loop")}class uc extends De{constructor(){super(...arguments),this.container=null}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_LOOP]}connectedCallback(){var e;super.connectedCallback(),this.container=((e=this.shadowRoot)==null?void 0:e.querySelector("#icon"))||null,this.container&&(this.container.textContent=R("Loop"))}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_LOOP&&this.container&&this.setAttribute("aria-checked",this.mediaLoop?"true":"false")}get mediaLoop(){return q(this,c.MEDIA_LOOP)}set mediaLoop(e){Y(this,c.MEDIA_LOOP,e)}handleClick(){const e=!this.mediaLoop,i=new _.CustomEvent(L.MEDIA_LOOP_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(i)}}uc.getSlotTemplateHTML=aT;uc.getTooltipContentHTML=rT;_.customElements.get("media-loop-button")||_.customElements.define("media-loop-button",uc);var $v=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},F=(t,e,i)=>($v(t,e,"read from private field"),i?i.call(t):e.get(t)),qt=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},hi=(t,e,i,a)=>($v(t,e,"write to private field"),e.set(t,i),i),Wa,zs,ea,en,Ii,Ri,Li,ta,Fa,Qs,gt;const Jh=1,em=0,nT=1,sT={processCallback(t,e,i){if(i){for(const[a,r]of e)if(a in i){const n=i[a];typeof n=="boolean"&&r instanceof It&&typeof r.element[r.attributeName]=="boolean"?r.booleanValue=n:typeof n=="function"&&r instanceof It?r.element[r.attributeName]=n:r.value=n}}}};class pl extends _.DocumentFragment{constructor(e,i,a=sT){var r;super(),qt(this,Wa,void 0),qt(this,zs,void 0),this.append(e.content.cloneNode(!0)),hi(this,Wa,Uv(this)),hi(this,zs,a),(r=a.createCallback)==null||r.call(a,this,F(this,Wa),i),a.processCallback(this,F(this,Wa),i)}update(e){F(this,zs).processCallback(this,F(this,Wa),e)}}Wa=new WeakMap;zs=new WeakMap;const Uv=(t,e=[])=>{let i,a;for(const r of t.attributes||[])if(r.value.includes("{{")){const n=new lT;for([i,a]of im(r.value))if(!i)n.append(a);else{const s=new It(t,r.name,r.namespaceURI);n.append(s),e.push([a,s])}r.value=n.toString()}for(const r of t.childNodes)if(r.nodeType===Jh&&!(r instanceof HTMLTemplateElement))Uv(r,e);else{const n=r.data;if(r.nodeType===Jh||n.includes("{{")){const s=[];if(n)for([i,a]of im(n))if(!i)s.push(new Text(a));else{const o=new yr(t);s.push(o),e.push([a,o])}else if(r instanceof HTMLTemplateElement){const o=new Wv(t,r);s.push(o),e.push([o.expression,o])}r.replaceWith(...s.flatMap(o=>o.replacementNodes||[o]))}}return e},tm={},im=t=>{let e="",i=0,a=tm[t],r=0,n;if(a)return a;for(a=[];n=t[r];r++)n==="{"&&t[r+1]==="{"&&t[r-1]!=="\\"&&t[r+2]&&++i==1?(e&&a.push([em,e]),e="",r++):n==="}"&&t[r+1]==="}"&&t[r-1]!=="\\"&&!--i?(a.push([nT,e.trim()]),e="",r++):e+=n||"";return e&&a.push([em,(i>0?"{{":"")+e]),tm[t]=a},oT=11;class Hv{get value(){return""}set value(e){}toString(){return this.value}}const Bv=new WeakMap;class lT{constructor(){qt(this,ea,[])}[Symbol.iterator](){return F(this,ea).values()}get length(){return F(this,ea).length}item(e){return F(this,ea)[e]}append(...e){for(const i of e)i instanceof It&&Bv.set(i,this),F(this,ea).push(i)}toString(){return F(this,ea).join("")}}ea=new WeakMap;class It extends Hv{constructor(e,i,a){super(),qt(this,ta),qt(this,en,""),qt(this,Ii,void 0),qt(this,Ri,void 0),qt(this,Li,void 0),hi(this,Ii,e),hi(this,Ri,i),hi(this,Li,a)}get attributeName(){return F(this,Ri)}get attributeNamespace(){return F(this,Li)}get element(){return F(this,Ii)}get value(){return F(this,en)}set value(e){F(this,en)!==e&&(hi(this,en,e),!F(this,ta,Fa)||F(this,ta,Fa).length===1?e==null?F(this,Ii).removeAttributeNS(F(this,Li),F(this,Ri)):F(this,Ii).setAttributeNS(F(this,Li),F(this,Ri),e):F(this,Ii).setAttributeNS(F(this,Li),F(this,Ri),F(this,ta,Fa).toString()))}get booleanValue(){return F(this,Ii).hasAttributeNS(F(this,Li),F(this,Ri))}set booleanValue(e){if(!F(this,ta,Fa)||F(this,ta,Fa).length===1)this.value=e?"":null;else throw new DOMException("Value is not fully templatized")}}en=new WeakMap;Ii=new WeakMap;Ri=new WeakMap;Li=new WeakMap;ta=new WeakSet;Fa=function(){return Bv.get(this)};class yr extends Hv{constructor(e,i){super(),qt(this,Qs,void 0),qt(this,gt,void 0),hi(this,Qs,e),hi(this,gt,i?[...i]:[new Text])}get replacementNodes(){return F(this,gt)}get parentNode(){return F(this,Qs)}get nextSibling(){return F(this,gt)[F(this,gt).length-1].nextSibling}get previousSibling(){return F(this,gt)[0].previousSibling}get value(){return F(this,gt).map(e=>e.textContent).join("")}set value(e){this.replace(e)}replace(...e){const i=e.flat().flatMap(a=>a==null?[new Text]:a.forEach?[...a]:a.nodeType===oT?[...a.childNodes]:a.nodeType?[a]:[new Text(a)]);i.length||i.push(new Text),hi(this,gt,dT(F(this,gt)[0].parentNode,F(this,gt),i,this.nextSibling))}}Qs=new WeakMap;gt=new WeakMap;class Wv extends yr{constructor(e,i){const a=i.getAttribute("directive")||i.getAttribute("type");let r=i.getAttribute("expression")||i.getAttribute(a)||"";r.startsWith("{{")&&(r=r.trim().slice(2,-2).trim()),super(e),this.expression=r,this.template=i,this.directive=a}}function dT(t,e,i,a=null){let r=0,n,s,o,l=i.length,u=e.length;for(;r<l&&r<u&&e[r]==i[r];)r++;for(;r<l&&r<u&&i[l-1]==e[u-1];)a=i[--u,--l];if(r==u)for(;r<l;)t.insertBefore(i[r++],a);if(r==l)for(;r<u;)t.removeChild(e[r++]);else{for(n=e[r];r<l;)o=i[r++],s=n?n.nextSibling:a,n==o?n=s:r<l&&i[r]==s?(t.replaceChild(o,n),n=s):t.insertBefore(o,n);for(;n!=a;)s=n.nextSibling,t.removeChild(n),n=s}return i}const am={string:t=>String(t)};class Fv{constructor(e){this.template=e,this.state=void 0}}const la=new WeakMap,da=new WeakMap,Cd={partial:(t,e)=>{e[t.expression]=new Fv(t.template)},if:(t,e)=>{var i;if(Kv(t.expression,e))if(la.get(t)!==t.template){la.set(t,t.template);const a=new pl(t.template,e,cc);t.replace(a),da.set(t,a)}else(i=da.get(t))==null||i.update(e);else t.replace(""),la.delete(t),da.delete(t)}},uT=Object.keys(Cd),cc={processCallback(t,e,i){var a,r;if(i)for(const[n,s]of e){if(s instanceof Wv){if(!s.directive){const l=uT.find(u=>s.template.hasAttribute(u));l&&(s.directive=l,s.expression=s.template.getAttribute(l))}(a=Cd[s.directive])==null||a.call(Cd,s,i);continue}let o=Kv(n,i);if(o instanceof Fv){la.get(s)!==o.template?(la.set(s,o.template),o=new pl(o.template,o.state,cc),s.value=o,da.set(s,o)):(r=da.get(s))==null||r.update(o.state);continue}o?(s instanceof It&&s.attributeName.startsWith("aria-")&&(o=String(o)),s instanceof It?typeof o=="boolean"?s.booleanValue=o:typeof o=="function"?s.element[s.attributeName]=o:s.value=o:(s.value=o,la.delete(s),da.delete(s))):s instanceof It?s.value=void 0:(s.value=void 0,la.delete(s),da.delete(s))}}},rm={"!":t=>!t,"!!":t=>!!t,"==":(t,e)=>t==e,"!=":(t,e)=>t!=e,">":(t,e)=>t>e,">=":(t,e)=>t>=e,"<":(t,e)=>t<e,"<=":(t,e)=>t<=e,"??":(t,e)=>t??e,"|":(t,e)=>{var i;return(i=am[e])==null?void 0:i.call(am,t)}};function cT(t){return hT(t,{boolean:/true|false/,number:/-?\d+\.?\d*/,string:/(["'])((?:\\.|[^\\])*?)\1/,operator:/[!=><][=!]?|\?\?|\|/,ws:/\s+/,param:/[$a-z_][$\w]*/i}).filter(({type:e})=>e!=="ws")}function Kv(t,e={}){var i,a,r,n,s,o,l;const u=cT(t);if(u.length===0||u.some(({type:m})=>!m))return Dr(t);if(((i=u[0])==null?void 0:i.token)===">"){const m=e[(a=u[1])==null?void 0:a.token];if(!m)return Dr(t);const p={...e};m.state=p;const h=u.slice(2);for(let d=0;d<h.length;d+=3){const v=(r=h[d])==null?void 0:r.token,E=(n=h[d+1])==null?void 0:n.token,b=(s=h[d+2])==null?void 0:s.token;v&&E==="="&&(p[v]=Mr(b,e))}return m}if(u.length===1)return is(u[0])?Mr(u[0].token,e):Dr(t);if(u.length===2){const m=(o=u[0])==null?void 0:o.token,p=rm[m];if(!p||!is(u[1]))return Dr(t);const h=Mr(u[1].token,e);return p(h)}if(u.length===3){const m=(l=u[1])==null?void 0:l.token,p=rm[m];if(!p||!is(u[0])||!is(u[2]))return Dr(t);const h=Mr(u[0].token,e);if(m==="|")return p(h,u[2].token);const d=Mr(u[2].token,e);return p(h,d)}}function Dr(t){return console.warn(`Warning: invalid expression \`${t}\``),!1}function is({type:t}){return["number","boolean","string","param"].includes(t)}function Mr(t,e){const i=t[0],a=t.slice(-1);return t==="true"||t==="false"?t==="true":i===a&&["'",'"'].includes(i)?t.slice(1,-1):Rp(t)?parseFloat(t):e[t]}function hT(t,e){let i,a,r;const n=[];for(;t;){r=null,i=t.length;for(const s in e)a=e[s].exec(t),a&&a.index<i&&(r={token:a[0],type:s,matches:a.slice(1)},i=a.index);i&&n.push({token:t.substr(0,i),type:void 0}),r&&n.push(r),t=t.substr(i+(r?r.token.length:0))}return n}var hc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Ci=(t,e,i)=>(hc(t,e,"read from private field"),i?i.call(t):e.get(t)),Qi=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},ci=(t,e,i,a)=>(hc(t,e,"write to private field"),e.set(t,i),i),xl=(t,e,i)=>(hc(t,e,"access private method"),i),rr,js,nr,Ka,Dd,Vv,Zs,Md,tn;const Nl={mediatargetlivewindow:"targetlivewindow",mediastreamtype:"streamtype"},qv=ye.createElement("template");qv.innerHTML=`
  <style>
    :host {
      display: inline-block;
      line-height: 0;
    }

    media-controller {
      width: 100%;
      height: 100%;
    }

    media-captions-button:not([mediasubtitleslist]),
    media-captions-menu:not([mediasubtitleslist]),
    media-captions-menu-button:not([mediasubtitleslist]),
    media-audio-track-menu[mediaaudiotrackunavailable],
    media-audio-track-menu-button[mediaaudiotrackunavailable],
    media-rendition-menu[mediarenditionunavailable],
    media-rendition-menu-button[mediarenditionunavailable],
    media-volume-range[mediavolumeunavailable],
    media-airplay-button[mediaairplayunavailable],
    media-fullscreen-button[mediafullscreenunavailable],
    media-cast-button[mediacastunavailable],
    media-pip-button[mediapipunavailable] {
      display: none;
    }
  </style>
`;class vl extends _.HTMLElement{constructor(){super(),Qi(this,Dd),Qi(this,Zs),Qi(this,rr,void 0),Qi(this,js,void 0),Qi(this,nr,void 0),Qi(this,Ka,void 0),Qi(this,tn,void 0),this.shadowRoot?this.renderRoot=this.shadowRoot:(this.renderRoot=this.attachShadow({mode:"open"}),this.createRenderer()),ci(this,Ka,new MutationObserver(e=>{var i;this.mediaController&&!((i=this.mediaController)!=null&&i.breakpointsComputed)||e.some(a=>{const r=a.target;return r===this?!0:r.localName!=="media-controller"?!1:!!(Nl[a.attributeName]||a.attributeName.startsWith("breakpoint"))})&&this.render()})),ci(this,tn,this.render.bind(this)),xl(this,Dd,Vv).call(this,"template")}get mediaController(){return this.renderRoot.querySelector("media-controller")}get template(){var e;return(e=Ci(this,rr))!=null?e:this.constructor.template}set template(e){if(e===null){this.removeAttribute("template");return}typeof e=="string"?this.setAttribute("template",e):e instanceof HTMLTemplateElement&&(ci(this,rr,e),ci(this,nr,null),this.createRenderer())}get props(){var e,i,a;const r=[...Array.from((i=(e=this.mediaController)==null?void 0:e.attributes)!=null?i:[]).filter(({name:s})=>Nl[s]||s.startsWith("breakpoint")),...Array.from(this.attributes)],n={};for(const s of r){const o=(a=Nl[s.name])!=null?a:m0(s.name);let{value:l}=s;l!=null?(Rp(l)&&(l=parseFloat(l)),n[o]=l===""?!0:l):n[o]=!1}return n}attributeChangedCallback(e,i,a){e==="template"&&i!=a&&xl(this,Zs,Md).call(this)}connectedCallback(){this.addEventListener(Xt.BREAKPOINTS_COMPUTED,Ci(this,tn)),Ci(this,Ka).observe(this,{attributes:!0}),Ci(this,Ka).observe(this.renderRoot,{attributes:!0,subtree:!0}),xl(this,Zs,Md).call(this)}disconnectedCallback(){this.removeEventListener(Xt.BREAKPOINTS_COMPUTED,Ci(this,tn)),Ci(this,Ka).disconnect()}createRenderer(){this.template instanceof HTMLTemplateElement&&this.template!==Ci(this,js)&&(ci(this,js,this.template),this.renderer=new pl(this.template,this.props,this.constructor.processor),this.renderRoot.textContent="",this.renderRoot.append(qv.content.cloneNode(!0),this.renderer))}render(){var e;(e=this.renderer)==null||e.update(this.props)}}rr=new WeakMap;js=new WeakMap;nr=new WeakMap;Ka=new WeakMap;Dd=new WeakSet;Vv=function(t){if(Object.prototype.hasOwnProperty.call(this,t)){const e=this[t];delete this[t],this[t]=e}};Zs=new WeakSet;Md=function(){var t;const e=this.getAttribute("template");if(!e||e===Ci(this,nr))return;const i=this.getRootNode(),a=(t=i?.getElementById)==null?void 0:t.call(i,e);if(a){ci(this,nr,e),ci(this,rr,a),this.createRenderer();return}mT(e)&&(ci(this,nr,e),pT(e).then(r=>{const n=ye.createElement("template");n.innerHTML=r,ci(this,rr,n),this.createRenderer()}).catch(console.error))};tn=new WeakMap;vl.observedAttributes=["template"];vl.processor=cc;function mT(t){if(!/^(\/|\.\/|https?:\/\/)/.test(t))return!1;const e=/^https?:\/\//.test(t)?void 0:location.origin;try{new URL(t,e)}catch{return!1}return!0}async function pT(t){const e=await fetch(t);if(e.status!==200)throw new Error(`Failed to load resource: the server responded with a status of ${e.status}`);return e.text()}_.customElements.get("media-theme")||_.customElements.define("media-theme",vl);function vT({anchor:t,floating:e,placement:i}){const a=fT({anchor:t,floating:e}),{x:r,y:n}=_T(a,i);return{x:r,y:n}}function fT({anchor:t,floating:e}){return{anchor:ET(t,e.offsetParent),floating:{x:0,y:0,width:e.offsetWidth,height:e.offsetHeight}}}function ET(t,e){var i;const a=t.getBoundingClientRect(),r=(i=e?.getBoundingClientRect())!=null?i:{x:0,y:0};return{x:a.x-r.x,y:a.y-r.y,width:a.width,height:a.height}}function _T({anchor:t,floating:e},i){const a=bT(i)==="x"?"y":"x",r=a==="y"?"height":"width",n=Yv(i),s=t.x+t.width/2-e.width/2,o=t.y+t.height/2-e.height/2,l=t[r]/2-e[r]/2;let u;switch(n){case"top":u={x:s,y:t.y-e.height};break;case"bottom":u={x:s,y:t.y+t.height};break;case"right":u={x:t.x+t.width,y:o};break;case"left":u={x:t.x-e.width,y:o};break;default:u={x:t.x,y:t.y}}switch(i.split("-")[1]){case"start":u[a]-=l;break;case"end":u[a]+=l;break}return u}function Yv(t){return t.split("-")[0]}function bT(t){return["top","bottom"].includes(Yv(t))?"y":"x"}class mc extends Event{constructor({action:e="auto",relatedTarget:i,...a}){super("invoke",a),this.action=e,this.relatedTarget=i}}class gT extends Event{constructor({newState:e,oldState:i,...a}){super("toggle",a),this.newState=e,this.oldState=i}}var pc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},z=(t,e,i)=>(pc(t,e,"read from private field"),i?i.call(t):e.get(t)),J=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},ot=(t,e,i,a)=>(pc(t,e,"write to private field"),e.set(t,i),i),ee=(t,e,i)=>(pc(t,e,"access private method"),i),Wt,$i,vi,Xs,an,ma,Nn,Od,Gv,Uo,vc,Ho,Js,xd,Nd,zv,Pd,Qv,$d,jv,sr,or,lr,Pn,Bo,fc,Ud,Zv,Ec,Xv,Hd,Jv,_c,ef,Bd,tf,Wd,af,fn,Wo,Fd,rf,En,Fo,eo,Kd;function fr({type:t,text:e,value:i,checked:a}){const r=ye.createElement("media-chrome-menu-item");r.type=t,r.part.add("menu-item"),r.part.add(t),r.value=i,r.checked=a;const n=ye.createElement("span");return n.textContent=e,r.append(n),r}function pa(t,e){let i=t.querySelector(`:scope > [slot="${e}"]`);if(i?.nodeName=="SLOT"&&(i=i.assignedElements({flatten:!0})[0]),i)return i=i.cloneNode(!0),i;const a=t.shadowRoot.querySelector(`[name="${e}"] > svg`);return a?a.cloneNode(!0):""}function yT(t){return`
    <style>
      :host {
        font: var(--media-font,
          var(--media-font-weight, normal)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        --_menu-bg: rgb(20 20 30 / .8);
        background: var(--media-menu-background, var(--media-control-background, var(--media-secondary-color, var(--_menu-bg))));
        border-radius: var(--media-menu-border-radius);
        border: var(--media-menu-border, none);
        display: var(--media-menu-display, inline-flex) !important;
        
        transition: var(--media-menu-transition-in,
          visibility 0s,
          opacity .2s ease-out,
          transform .15s ease-out,
          left .2s ease-in-out,
          min-width .2s ease-in-out,
          min-height .2s ease-in-out
        ) !important;
        
        visibility: var(--media-menu-visibility, visible);
        opacity: var(--media-menu-opacity, 1);
        max-height: var(--media-menu-max-height, var(--_menu-max-height, 300px));
        transform: var(--media-menu-transform-in, translateY(0) scale(1));
        flex-direction: column;
        
        min-height: 0;
        position: relative;
        bottom: var(--_menu-bottom);
        box-sizing: border-box;
      } 

      @-moz-document url-prefix() {
        :host{
          --_menu-bg: rgb(20 20 30);
        }
      }

      :host([hidden]) {
        transition: var(--media-menu-transition-out,
          visibility .15s ease-in,
          opacity .15s ease-in,
          transform .15s ease-in
        ) !important;
        visibility: var(--media-menu-hidden-visibility, hidden);
        opacity: var(--media-menu-hidden-opacity, 0);
        max-height: var(--media-menu-hidden-max-height,
          var(--media-menu-max-height, var(--_menu-max-height, 300px)));
        transform: var(--media-menu-transform-out, translateY(2px) scale(.99));
        pointer-events: none;
      }

      :host([slot="submenu"]) {
        background: none;
        width: 100%;
        min-height: 100%;
        position: absolute;
        bottom: 0;
        right: -100%;
      }

      #container {
        display: flex;
        flex-direction: column;
        min-height: 0;
        transition: transform .2s ease-out;
        transform: translate(0, 0);
      }

      #container.has-expanded {
        transition: transform .2s ease-in;
        transform: translate(-100%, 0);
      }

      button {
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        font: inherit;
        outline: inherit;
        display: inline-flex;
        align-items: center;
      }

      slot[name="header"][hidden] {
        display: none;
      }

      slot[name="header"] > *,
      slot[name="header"]::slotted(*) {
        padding: .4em .7em;
        border-bottom: 1px solid rgb(255 255 255 / .25);
        cursor: var(--media-cursor, default);
      }

      slot[name="header"] > button[part~="back"],
      slot[name="header"]::slotted(button[part~="back"]) {
        cursor: var(--media-cursor, pointer);
      }

      svg[part~="back"] {
        height: var(--media-menu-icon-height, var(--media-control-height, 24px));
        fill: var(--media-icon-color, var(--media-primary-color, rgb(238 238 238)));
        display: block;
        margin-right: .5ch;
      }

      slot:not([name]) {
        gap: var(--media-menu-gap);
        flex-direction: var(--media-menu-flex-direction, column);
        overflow: var(--media-menu-overflow, hidden auto);
        display: flex;
        min-height: 0;
      }

      :host([role="menu"]) slot:not([name]) {
        padding-block: .4em;
      }

      slot:not([name])::slotted([role="menu"]) {
        background: none;
      }

      media-chrome-menu-item > span {
        margin-right: .5ch;
        max-width: var(--media-menu-item-max-width);
        text-overflow: ellipsis;
        overflow: hidden;
      }
    </style>
    <style id="layout-row" media="width:0">

      slot[name="header"] > *,
      slot[name="header"]::slotted(*) {
        padding: .4em .5em;
      }

      slot:not([name]) {
        gap: var(--media-menu-gap, .25em);
        flex-direction: var(--media-menu-flex-direction, row);
        padding-inline: .5em;
      }

      media-chrome-menu-item {
        padding: .3em .5em;
      }

      media-chrome-menu-item[aria-checked="true"] {
        background: var(--media-menu-item-checked-background, rgb(255 255 255 / .2));
      }

      
      media-chrome-menu-item::part(checked-indicator) {
        display: var(--media-menu-item-checked-indicator-display, none);
      }
    </style>
    <div id="container" part="container">
      <slot name="header" hidden>
        <button part="back button" aria-label="Back to previous menu">
          <slot name="back-icon">
            <svg aria-hidden="true" viewBox="0 0 20 24" part="back indicator">
              <path d="m11.88 17.585.742-.669-4.2-4.665 4.2-4.666-.743-.669-4.803 5.335 4.803 5.334Z"/>
            </svg>
          </slot>
          <slot name="title"></slot>
        </button>
      </slot>
      <slot></slot>
    </div>
    <slot name="checked-indicator" hidden></slot>
  `}const ji={STYLE:"style",HIDDEN:"hidden",DISABLED:"disabled",ANCHOR:"anchor"};class ht extends _.HTMLElement{constructor(){if(super(),J(this,Od),J(this,Uo),J(this,Js),J(this,Nd),J(this,Pd),J(this,$d),J(this,lr),J(this,Bo),J(this,Ud),J(this,Ec),J(this,Hd),J(this,_c),J(this,Bd),J(this,Wd),J(this,fn),J(this,Fd),J(this,En),J(this,eo),J(this,Wt,null),J(this,$i,null),J(this,vi,null),J(this,Xs,new Set),J(this,an,void 0),J(this,ma,!1),J(this,Nn,null),J(this,Ho,()=>{const e=z(this,Xs),i=new Set(this.items);for(const a of e)i.has(a)||this.dispatchEvent(new CustomEvent("removemenuitem",{detail:a}));for(const a of i)e.has(a)||this.dispatchEvent(new CustomEvent("addmenuitem",{detail:a}));ot(this,Xs,i)}),J(this,sr,()=>{ee(this,lr,Pn).call(this),ee(this,Bo,fc).call(this,!1)}),J(this,or,()=>{ee(this,lr,Pn).call(this)}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}this.container=this.shadowRoot.querySelector("#container"),this.defaultSlot=this.shadowRoot.querySelector("slot:not([name])"),ot(this,an,new MutationObserver(z(this,Ho)))}static get observedAttributes(){return[ji.DISABLED,ji.HIDDEN,ji.STYLE,ji.ANCHOR,Q.MEDIA_CONTROLLER]}static formatMenuItemText(e,i){return e}enable(){this.addEventListener("click",this),this.addEventListener("focusout",this),this.addEventListener("keydown",this),this.addEventListener("invoke",this),this.addEventListener("toggle",this)}disable(){this.removeEventListener("click",this),this.removeEventListener("focusout",this),this.removeEventListener("keyup",this),this.removeEventListener("invoke",this),this.removeEventListener("toggle",this)}handleEvent(e){switch(e.type){case"slotchange":ee(this,Od,Gv).call(this,e);break;case"invoke":ee(this,Nd,zv).call(this,e);break;case"click":ee(this,Ud,Zv).call(this,e);break;case"toggle":ee(this,Hd,Jv).call(this,e);break;case"focusout":ee(this,Bd,tf).call(this,e);break;case"keydown":ee(this,Wd,af).call(this,e);break}}connectedCallback(){var e,i;z(this,an).observe(this.defaultSlot,{childList:!0}),ot(this,Nn,Ru(this.shadowRoot,":host")),ee(this,Js,xd).call(this),this.hasAttribute("disabled")||this.enable(),this.role||(this.role="menu"),ot(this,Wt,id(this)),(i=(e=z(this,Wt))==null?void 0:e.associateElement)==null||i.call(e,this),this.hidden||(hr($n(this),z(this,sr)),hr(this,z(this,or))),ee(this,Uo,vc).call(this),this.shadowRoot.addEventListener("slotchange",this)}disconnectedCallback(){var e,i;z(this,an).disconnect(),mr($n(this),z(this,sr)),mr(this,z(this,or)),this.disable(),(i=(e=z(this,Wt))==null?void 0:e.unassociateElement)==null||i.call(e,this),ot(this,Wt,null),ot(this,$i,null),ot(this,vi,null),this.shadowRoot.removeEventListener("slotchange",this)}attributeChangedCallback(e,i,a){var r,n,s,o;e===ji.HIDDEN&&a!==i?(z(this,ma)||ot(this,ma,!0),this.hidden?ee(this,$d,jv).call(this):ee(this,Pd,Qv).call(this),this.dispatchEvent(new gT({oldState:this.hidden?"open":"closed",newState:this.hidden?"closed":"open",bubbles:!0}))):e===Q.MEDIA_CONTROLLER?(i&&((n=(r=z(this,Wt))==null?void 0:r.unassociateElement)==null||n.call(r,this),ot(this,Wt,null)),a&&this.isConnected&&(ot(this,Wt,id(this)),(o=(s=z(this,Wt))==null?void 0:s.associateElement)==null||o.call(s,this))):e===ji.DISABLED&&a!==i?a==null?this.enable():this.disable():e===ji.STYLE&&a!==i&&ee(this,Js,xd).call(this)}formatMenuItemText(e,i){return this.constructor.formatMenuItemText(e,i)}get anchor(){return this.getAttribute("anchor")}set anchor(e){this.setAttribute("anchor",`${e}`)}get anchorElement(){var e;return this.anchor?(e=il(this))==null?void 0:e.querySelector(`#${this.anchor}`):null}get items(){return this.defaultSlot.assignedElements({flatten:!0}).filter(TT)}get radioGroupItems(){return this.items.filter(e=>e.role==="menuitemradio")}get checkedItems(){return this.items.filter(e=>e.checked)}get value(){var e,i;return(i=(e=this.checkedItems[0])==null?void 0:e.value)!=null?i:""}set value(e){const i=this.items.find(a=>a.value===e);i&&ee(this,eo,Kd).call(this,i)}focus(){if(ot(this,$i,Iu()),this.items.length){ee(this,En,Fo).call(this,this.items[0]),this.items[0].focus();return}const e=this.querySelector('[autofocus], [tabindex]:not([tabindex="-1"]), [role="menu"]');e?.focus()}handleSelect(e){var i;const a=ee(this,fn,Wo).call(this,e);a&&(ee(this,eo,Kd).call(this,a,a.type==="checkbox"),z(this,vi)&&!this.hidden&&((i=z(this,$i))==null||i.focus(),this.hidden=!0))}get keysUsed(){return["Enter","Escape","Tab"," ","ArrowDown","ArrowUp","Home","End"]}handleMove(e){var i,a;const{key:r}=e,n=this.items,s=(a=(i=ee(this,fn,Wo).call(this,e))!=null?i:ee(this,Fd,rf).call(this))!=null?a:n[0],o=n.indexOf(s);let l=Math.max(0,o);r==="ArrowDown"?l++:r==="ArrowUp"?l--:e.key==="Home"?l=0:e.key==="End"&&(l=n.length-1),l<0&&(l=n.length-1),l>n.length-1&&(l=0),ee(this,En,Fo).call(this,n[l]),n[l].focus()}}Wt=new WeakMap;$i=new WeakMap;vi=new WeakMap;Xs=new WeakMap;an=new WeakMap;ma=new WeakMap;Nn=new WeakMap;Od=new WeakSet;Gv=function(t){const e=t.target;for(const i of e.assignedNodes({flatten:!0}))i.nodeType===3&&i.textContent.trim()===""&&i.remove();["header","title"].includes(e.name)&&ee(this,Uo,vc).call(this),e.name||z(this,Ho).call(this)};Uo=new WeakSet;vc=function(){const t=this.shadowRoot.querySelector('slot[name="header"]'),e=this.shadowRoot.querySelector('slot[name="title"]');t.hidden=e.assignedNodes().length===0&&t.assignedNodes().length===0};Ho=new WeakMap;Js=new WeakSet;xd=function(){var t;const e=this.shadowRoot.querySelector("#layout-row"),i=(t=getComputedStyle(this).getPropertyValue("--media-menu-layout"))==null?void 0:t.trim();e.setAttribute("media",i==="row"?"":"width:0")};Nd=new WeakSet;zv=function(t){ot(this,vi,t.relatedTarget),_i(this,t.relatedTarget)||(this.hidden=!this.hidden)};Pd=new WeakSet;Qv=function(){var t;(t=z(this,vi))==null||t.setAttribute("aria-expanded","true"),this.addEventListener("transitionend",()=>this.focus(),{once:!0}),hr($n(this),z(this,sr)),hr(this,z(this,or))};$d=new WeakSet;jv=function(){var t;(t=z(this,vi))==null||t.setAttribute("aria-expanded","false"),mr($n(this),z(this,sr)),mr(this,z(this,or))};sr=new WeakMap;or=new WeakMap;lr=new WeakSet;Pn=function(t){if(this.hasAttribute("mediacontroller")&&!this.anchor||this.hidden||!this.anchorElement)return;const{x:e,y:i}=vT({anchor:this.anchorElement,floating:this,placement:"top-start"});t??(t=this.offsetWidth);const r=$n(this).getBoundingClientRect(),n=r.width-e-t,s=r.height-i-this.offsetHeight,{style:o}=z(this,Nn);o.setProperty("position","absolute"),o.setProperty("right",`${Math.max(0,n)}px`),o.setProperty("--_menu-bottom",`${s}px`);const l=getComputedStyle(this),m=o.getPropertyValue("--_menu-bottom")===l.bottom?s:parseFloat(l.bottom),p=r.height-m-parseFloat(l.marginBottom);this.style.setProperty("--_menu-max-height",`${p}px`)};Bo=new WeakSet;fc=function(t){const e=this.querySelector('[role="menuitem"][aria-haspopup][aria-expanded="true"]'),i=e?.querySelector('[role="menu"]'),{style:a}=z(this,Nn);if(t||a.setProperty("--media-menu-transition-in","none"),i){const r=i.offsetHeight,n=Math.max(i.offsetWidth,e.offsetWidth);this.style.setProperty("min-width",`${n}px`),this.style.setProperty("min-height",`${r}px`),ee(this,lr,Pn).call(this,n)}else this.style.removeProperty("min-width"),this.style.removeProperty("min-height"),ee(this,lr,Pn).call(this);a.removeProperty("--media-menu-transition-in")};Ud=new WeakSet;Zv=function(t){var e;if(t.stopPropagation(),t.composedPath().includes(z(this,Ec,Xv))){(e=z(this,$i))==null||e.focus(),this.hidden=!0;return}const i=ee(this,fn,Wo).call(this,t);!i||i.hasAttribute("disabled")||(ee(this,En,Fo).call(this,i),this.handleSelect(t))};Ec=new WeakSet;Xv=function(){var t;return(t=this.shadowRoot.querySelector('slot[name="header"]').assignedElements({flatten:!0}))==null?void 0:t.find(i=>i.matches('button[part~="back"]'))};Hd=new WeakSet;Jv=function(t){if(t.target===this)return;ee(this,_c,ef).call(this);const e=Array.from(this.querySelectorAll('[role="menuitem"][aria-haspopup]'));for(const i of e)i.invokeTargetElement!=t.target&&t.newState=="open"&&i.getAttribute("aria-expanded")=="true"&&!i.invokeTargetElement.hidden&&i.invokeTargetElement.dispatchEvent(new mc({relatedTarget:i}));for(const i of e)i.setAttribute("aria-expanded",`${!i.submenuElement.hidden}`);ee(this,Bo,fc).call(this,!0)};_c=new WeakSet;ef=function(){const e=this.querySelector('[role="menuitem"] > [role="menu"]:not([hidden])');this.container.classList.toggle("has-expanded",!!e)};Bd=new WeakSet;tf=function(t){var e;_i(this,t.relatedTarget)||(z(this,ma)&&((e=z(this,$i))==null||e.focus()),z(this,vi)&&z(this,vi)!==t.relatedTarget&&!this.hidden&&(this.hidden=!0))};Wd=new WeakSet;af=function(t){var e,i,a,r,n;const{key:s,ctrlKey:o,altKey:l,metaKey:u}=t;if(!(o||l||u)&&this.keysUsed.includes(s))if(t.preventDefault(),t.stopPropagation(),s==="Tab"){if(z(this,ma)){this.hidden=!0;return}t.shiftKey?(i=(e=this.previousElementSibling)==null?void 0:e.focus)==null||i.call(e):(r=(a=this.nextElementSibling)==null?void 0:a.focus)==null||r.call(a),this.blur()}else s==="Escape"?((n=z(this,$i))==null||n.focus(),z(this,ma)&&(this.hidden=!0)):s==="Enter"||s===" "?this.handleSelect(t):this.handleMove(t)};fn=new WeakSet;Wo=function(t){return t.composedPath().find(e=>["menuitemradio","menuitemcheckbox"].includes(e.role))};Fd=new WeakSet;rf=function(){return this.items.find(t=>t.tabIndex===0)};En=new WeakSet;Fo=function(t){for(const e of this.items)e.tabIndex=e===t?0:-1};eo=new WeakSet;Kd=function(t,e){const i=[...this.checkedItems];t.type==="radio"&&this.radioGroupItems.forEach(a=>a.checked=!1),e?t.checked=!t.checked:t.checked=!0,this.checkedItems.some((a,r)=>a!=i[r])&&this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))};ht.shadowRootOptions={mode:"open"};ht.getTemplateHTML=yT;function TT(t){return["menuitem","menuitemradio","menuitemcheckbox"].includes(t?.role)}function $n(t){var e;return(e=t.getAttribute("bounds")?_r(t,`#${t.getAttribute("bounds")}`):Ye(t)||t.parentElement)!=null?e:t}_.customElements.get("media-chrome-menu")||_.customElements.define("media-chrome-menu",ht);var bc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Ke=(t,e,i)=>(bc(t,e,"read from private field"),i?i.call(t):e.get(t)),ai=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},Pl=(t,e,i,a)=>(bc(t,e,"write to private field"),e.set(t,i),i),Ja=(t,e,i)=>(bc(t,e,"access private method"),i),to,_n,Vd,nf,Ko,gc,yc,sf,Qt,Va,qd,io,Yd;function AT(t){return`
    <style>
      :host {
        transition: var(--media-menu-item-transition,
          background .15s linear,
          opacity .2s ease-in-out
        );
        outline: var(--media-menu-item-outline, 0);
        outline-offset: var(--media-menu-item-outline-offset, -1px);
        cursor: var(--media-cursor, pointer);
        display: flex;
        align-items: center;
        align-self: stretch;
        justify-self: stretch;
        white-space: nowrap;
        white-space-collapse: collapse;
        text-wrap: nowrap;
        padding: .4em .8em .4em 1em;
      }

      :host(:focus-visible) {
        box-shadow: var(--media-menu-item-focus-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        outline: var(--media-menu-item-hover-outline, 0);
        outline-offset: var(--media-menu-item-hover-outline-offset,  var(--media-menu-item-outline-offset, -1px));
      }

      :host(:hover) {
        cursor: var(--media-cursor, pointer);
        background: var(--media-menu-item-hover-background, rgb(92 92 102 / .5));
        outline: var(--media-menu-item-hover-outline);
        outline-offset: var(--media-menu-item-hover-outline-offset,  var(--media-menu-item-outline-offset, -1px));
      }

      :host([aria-checked="true"]) {
        background: var(--media-menu-item-checked-background);
      }

      :host([hidden]) {
        display: none;
      }

      :host([disabled]) {
        pointer-events: none;
        color: rgba(255, 255, 255, .3);
      }

      slot:not([name]) {
        width: 100%;
      }

      slot:not([name="submenu"]) {
        display: inline-flex;
        align-items: center;
        transition: inherit;
        opacity: var(--media-menu-item-opacity, 1);
      }

      slot[name="description"] {
        justify-content: end;
      }

      slot[name="description"] > span {
        display: inline-block;
        margin-inline: 1em .2em;
        max-width: var(--media-menu-item-description-max-width, 100px);
        text-overflow: ellipsis;
        overflow: hidden;
        font-size: .8em;
        font-weight: 400;
        text-align: right;
        position: relative;
        top: .04em;
      }

      slot[name="checked-indicator"] {
        display: none;
      }

      :host(:is([role="menuitemradio"],[role="menuitemcheckbox"])) slot[name="checked-indicator"] {
        display: var(--media-menu-item-checked-indicator-display, inline-block);
      }

      
      svg, img, ::slotted(svg), ::slotted(img) {
        height: var(--media-menu-item-icon-height, var(--media-control-height, 24px));
        fill: var(--media-icon-color, var(--media-primary-color, rgb(238 238 238)));
        display: block;
      }

      
      [part~="indicator"],
      ::slotted([part~="indicator"]) {
        fill: var(--media-menu-item-indicator-fill,
          var(--media-icon-color, var(--media-primary-color, rgb(238 238 238))));
        height: var(--media-menu-item-indicator-height, 1.25em);
        margin-right: .5ch;
      }

      [part~="checked-indicator"] {
        visibility: hidden;
      }

      :host([aria-checked="true"]) [part~="checked-indicator"] {
        visibility: visible;
      }
    </style>
    <slot name="checked-indicator">
      <svg aria-hidden="true" viewBox="0 1 24 24" part="checked-indicator indicator">
        <path d="m10 15.17 9.193-9.191 1.414 1.414-10.606 10.606-6.364-6.364 1.414-1.414 4.95 4.95Z"/>
      </svg>
    </slot>
    <slot name="prefix"></slot>
    <slot></slot>
    <slot name="description"></slot>
    <slot name="suffix">
      ${this.getSuffixSlotInnerHTML(t)}
    </slot>
    <slot name="submenu"></slot>
  `}function kT(t){return""}const rt={TYPE:"type",VALUE:"value",CHECKED:"checked",DISABLED:"disabled"};class Ki extends _.HTMLElement{constructor(){if(super(),ai(this,Vd),ai(this,Ko),ai(this,yc),ai(this,io),ai(this,to,!1),ai(this,_n,void 0),ai(this,Qt,()=>{var e,i;this.submenuElement.items&&this.setAttribute("submenusize",`${this.submenuElement.items.length}`);const a=this.shadowRoot.querySelector('slot[name="description"]'),r=(e=this.submenuElement.checkedItems)==null?void 0:e[0],n=(i=r?.dataset.description)!=null?i:r?.text,s=ye.createElement("span");s.textContent=n??"",a.replaceChildren(s)}),ai(this,Va,e=>{const{key:i}=e;if(!this.keysUsed.includes(i)){this.removeEventListener("keyup",Ke(this,Va));return}this.handleClick(e)}),ai(this,qd,e=>{const{metaKey:i,altKey:a,key:r}=e;if(i||a||!this.keysUsed.includes(r)){this.removeEventListener("keyup",Ke(this,Va));return}this.addEventListener("keyup",Ke(this,Va),{once:!0})}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);const e=tt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[rt.TYPE,rt.DISABLED,rt.CHECKED,rt.VALUE]}enable(){this.hasAttribute("tabindex")||this.setAttribute("tabindex","-1"),Or(this)&&!this.hasAttribute("aria-checked")&&this.setAttribute("aria-checked","false"),this.addEventListener("click",this),this.addEventListener("keydown",this)}disable(){this.removeAttribute("tabindex"),this.removeEventListener("click",this),this.removeEventListener("keydown",this),this.removeEventListener("keyup",this)}handleEvent(e){switch(e.type){case"slotchange":Ja(this,Vd,nf).call(this,e);break;case"click":this.handleClick(e);break;case"keydown":Ke(this,qd).call(this,e);break;case"keyup":Ke(this,Va).call(this,e);break}}attributeChangedCallback(e,i,a){e===rt.CHECKED&&Or(this)&&!Ke(this,to)?this.setAttribute("aria-checked",a!=null?"true":"false"):e===rt.TYPE&&a!==i?this.role="menuitem"+a:e===rt.DISABLED&&a!==i&&(a==null?this.enable():this.disable())}connectedCallback(){this.hasAttribute(rt.DISABLED)||this.enable(),this.role="menuitem"+this.type,Pl(this,_n,Gd(this,this.parentNode)),Ja(this,io,Yd).call(this),this.submenuElement&&Ja(this,Ko,gc).call(this),this.shadowRoot.addEventListener("slotchange",this)}disconnectedCallback(){this.disable(),Ja(this,io,Yd).call(this),Pl(this,_n,null),this.shadowRoot.removeEventListener("slotchange",this)}get invokeTarget(){return this.getAttribute("invoketarget")}set invokeTarget(e){this.setAttribute("invoketarget",`${e}`)}get invokeTargetElement(){var e;return this.invokeTarget?(e=il(this))==null?void 0:e.querySelector(`#${this.invokeTarget}`):this.submenuElement}get submenuElement(){return this.shadowRoot.querySelector('slot[name="submenu"]').assignedElements({flatten:!0})[0]}get type(){var e;return(e=this.getAttribute(rt.TYPE))!=null?e:""}set type(e){this.setAttribute(rt.TYPE,`${e}`)}get value(){var e;return(e=this.getAttribute(rt.VALUE))!=null?e:this.text}set value(e){this.setAttribute(rt.VALUE,e)}get text(){var e;return((e=this.textContent)!=null?e:"").trim()}get checked(){if(Or(this))return this.getAttribute("aria-checked")==="true"}set checked(e){Or(this)&&(Pl(this,to,!0),this.setAttribute("aria-checked",e?"true":"false"),e?this.part.add("checked"):this.part.remove("checked"))}handleClick(e){Or(this)||this.invokeTargetElement&&_i(this,e.target)&&this.invokeTargetElement.dispatchEvent(new mc({relatedTarget:this}))}get keysUsed(){return["Enter"," "]}}to=new WeakMap;_n=new WeakMap;Vd=new WeakSet;nf=function(t){const e=t.target;if(!e?.name)for(const a of e.assignedNodes({flatten:!0}))a instanceof Text&&a.textContent.trim()===""&&a.remove();e.name==="submenu"&&(this.submenuElement?Ja(this,Ko,gc).call(this):Ja(this,yc,sf).call(this))};Ko=new WeakSet;gc=async function(){this.setAttribute("aria-haspopup","menu"),this.setAttribute("aria-expanded",`${!this.submenuElement.hidden}`),this.submenuElement.addEventListener("change",Ke(this,Qt)),this.submenuElement.addEventListener("addmenuitem",Ke(this,Qt)),this.submenuElement.addEventListener("removemenuitem",Ke(this,Qt)),Ke(this,Qt).call(this)};yc=new WeakSet;sf=function(){this.removeAttribute("aria-haspopup"),this.removeAttribute("aria-expanded"),this.submenuElement.removeEventListener("change",Ke(this,Qt)),this.submenuElement.removeEventListener("addmenuitem",Ke(this,Qt)),this.submenuElement.removeEventListener("removemenuitem",Ke(this,Qt)),Ke(this,Qt).call(this)};Qt=new WeakMap;Va=new WeakMap;qd=new WeakMap;io=new WeakSet;Yd=function(){var t;const e=(t=Ke(this,_n))==null?void 0:t.radioGroupItems;if(!e)return;let i=e.filter(a=>a.getAttribute("aria-checked")==="true").pop();i||(i=e[0]);for(const a of e)a.setAttribute("aria-checked","false");i?.setAttribute("aria-checked","true")};Ki.shadowRootOptions={mode:"open"};Ki.getTemplateHTML=AT;Ki.getSuffixSlotInnerHTML=kT;function Or(t){return t.type==="radio"||t.type==="checkbox"}function Gd(t,e){if(!t)return null;const{host:i}=t.getRootNode();return!e&&i?Gd(t,i):e?.items?e:Gd(e,e?.parentNode)}_.customElements.get("media-chrome-menu-item")||_.customElements.define("media-chrome-menu-item",Ki);function ST(t){return`
    ${ht.getTemplateHTML(t)}
    <style>
      :host {
        --_menu-bg: rgb(20 20 30 / .8);
        background: var(--media-settings-menu-background,
            var(--media-menu-background,
              var(--media-control-background,
                var(--media-secondary-color, var(--_menu-bg)))));
        min-width: var(--media-settings-menu-min-width, 170px);
        border-radius: 2px 2px 0 0;
        overflow: hidden;
      }

      @-moz-document url-prefix() {
        :host{
          --_menu-bg: rgb(20 20 30);
        }
      }

      :host([role="menu"]) {
        
        justify-content: end;
      }

      slot:not([name]) {
        justify-content: var(--media-settings-menu-justify-content);
        flex-direction: var(--media-settings-menu-flex-direction, column);
        overflow: visible;
      }

      #container.has-expanded {
        --media-settings-menu-item-opacity: 0;
      }
    </style>
  `}class of extends ht{get anchorElement(){return this.anchor!=="auto"?super.anchorElement:Ye(this).querySelector("media-settings-menu-button")}}of.getTemplateHTML=ST;_.customElements.get("media-settings-menu")||_.customElements.define("media-settings-menu",of);function wT(t){return`
    ${Ki.getTemplateHTML.call(this,t)}
    <style>
      slot:not([name="submenu"]) {
        opacity: var(--media-settings-menu-item-opacity, var(--media-menu-item-opacity));
      }

      :host([aria-expanded="true"]:hover) {
        background: transparent;
      }
    </style>
  `}function IT(t){return`
    <svg aria-hidden="true" viewBox="0 0 20 24">
      <path d="m8.12 17.585-.742-.669 4.2-4.665-4.2-4.666.743-.669 4.803 5.335-4.803 5.334Z"/>
    </svg>
  `}class fl extends Ki{}fl.shadowRootOptions={mode:"open"};fl.getTemplateHTML=wT;fl.getSuffixSlotInnerHTML=IT;_.customElements.get("media-settings-menu-item")||_.customElements.define("media-settings-menu-item",fl);class Tr extends De{connectedCallback(){super.connectedCallback(),this.invokeTargetElement&&this.setAttribute("aria-haspopup","menu")}get invokeTarget(){return this.getAttribute("invoketarget")}set invokeTarget(e){this.setAttribute("invoketarget",`${e}`)}get invokeTargetElement(){var e;return this.invokeTarget?(e=il(this))==null?void 0:e.querySelector(`#${this.invokeTarget}`):null}handleClick(){var e;(e=this.invokeTargetElement)==null||e.dispatchEvent(new mc({relatedTarget:this}))}}_.customElements.get("media-chrome-menu-button")||_.customElements.define("media-chrome-menu-button",Tr);function RT(){return`
    <style>
      :host([aria-expanded="true"]) slot[name=tooltip] {
        display: none;
      }
    </style>
    <slot name="icon">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4.5 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
      </svg>
    </slot>
  `}function LT(){return R("Settings")}class Tc extends Tr{static get observedAttributes(){return[...super.observedAttributes,"target"]}connectedCallback(){super.connectedCallback(),this.setAttribute("aria-label",R("settings"))}get invokeTargetElement(){return this.invokeTarget!=null?super.invokeTargetElement:Ye(this).querySelector("media-settings-menu")}}Tc.getSlotTemplateHTML=RT;Tc.getTooltipContentHTML=LT;_.customElements.get("media-settings-menu-button")||_.customElements.define("media-settings-menu-button",Tc);var Ac=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},lf=(t,e,i)=>(Ac(t,e,"read from private field"),i?i.call(t):e.get(t)),as=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},zd=(t,e,i,a)=>(Ac(t,e,"write to private field"),e.set(t,i),i),rs=(t,e,i)=>(Ac(t,e,"access private method"),i),rn,Vo,ao,Qd,ro,jd;class CT extends ht{constructor(){super(...arguments),as(this,ao),as(this,ro),as(this,rn,[]),as(this,Vo,void 0)}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_AUDIO_TRACK_LIST,c.MEDIA_AUDIO_TRACK_ENABLED,c.MEDIA_AUDIO_TRACK_UNAVAILABLE]}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_AUDIO_TRACK_ENABLED&&i!==a?this.value=a:e===c.MEDIA_AUDIO_TRACK_LIST&&i!==a&&(zd(this,rn,u0(a??"")),rs(this,ao,Qd).call(this))}connectedCallback(){super.connectedCallback(),this.addEventListener("change",rs(this,ro,jd))}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("change",rs(this,ro,jd))}get anchorElement(){var e;return this.anchor!=="auto"?super.anchorElement:(e=Ye(this))==null?void 0:e.querySelector("media-audio-track-menu-button")}get mediaAudioTrackList(){return lf(this,rn)}set mediaAudioTrackList(e){zd(this,rn,e),rs(this,ao,Qd).call(this)}get mediaAudioTrackEnabled(){var e;return(e=oe(this,c.MEDIA_AUDIO_TRACK_ENABLED))!=null?e:""}set mediaAudioTrackEnabled(e){ae(this,c.MEDIA_AUDIO_TRACK_ENABLED,e)}}rn=new WeakMap;Vo=new WeakMap;ao=new WeakSet;Qd=function(){if(lf(this,Vo)===JSON.stringify(this.mediaAudioTrackList))return;zd(this,Vo,JSON.stringify(this.mediaAudioTrackList));const t=this.mediaAudioTrackList;this.defaultSlot.textContent="",t.sort((e,i)=>e.id.localeCompare(i.id,void 0,{numeric:!0}));for(const e of t){const i=this.formatMenuItemText(e.label,e),a=fr({type:"radio",text:i,value:`${e.id}`,checked:e.enabled});a.prepend(pa(this,"checked-indicator")),this.defaultSlot.append(a)}};ro=new WeakSet;jd=function(){if(this.value==null)return;const t=new _.CustomEvent(L.MEDIA_AUDIO_TRACK_REQUEST,{composed:!0,bubbles:!0,detail:this.value});this.dispatchEvent(t)};_.customElements.get("media-audio-track-menu")||_.customElements.define("media-audio-track-menu",CT);const DT=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M11 17H9.5V7H11v10Zm-3-3H6.5v-4H8v4Zm6-5h-1.5v6H14V9Zm3 7h-1.5V8H17v8Z"/>
  <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Zm-2 0a8 8 0 1 0-16 0 8 8 0 0 0 16 0Z"/>
</svg>`;function MT(){return`
    <style>
      :host([aria-expanded="true"]) slot[name=tooltip] {
        display: none;
      }
    </style>
    <slot name="icon">${DT}</slot>
  `}function OT(){return R("Audio")}const nm=t=>{const e=R("Audio");t.setAttribute("aria-label",e)};class kc extends Tr{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_AUDIO_TRACK_ENABLED,c.MEDIA_AUDIO_TRACK_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),nm(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_LANG&&nm(this)}get invokeTargetElement(){var e;return this.invokeTarget!=null?super.invokeTargetElement:(e=Ye(this))==null?void 0:e.querySelector("media-audio-track-menu")}get mediaAudioTrackEnabled(){var e;return(e=oe(this,c.MEDIA_AUDIO_TRACK_ENABLED))!=null?e:""}set mediaAudioTrackEnabled(e){ae(this,c.MEDIA_AUDIO_TRACK_ENABLED,e)}}kc.getSlotTemplateHTML=MT;kc.getTooltipContentHTML=OT;_.customElements.get("media-audio-track-menu-button")||_.customElements.define("media-audio-track-menu-button",kc);var Sc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},xT=(t,e,i)=>(Sc(t,e,"read from private field"),e.get(t)),$l=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},NT=(t,e,i,a)=>(Sc(t,e,"write to private field"),e.set(t,i),i),ns=(t,e,i)=>(Sc(t,e,"access private method"),i),qo,no,Zd,so,Xd;const PT=`
  <svg aria-hidden="true" viewBox="0 0 26 24" part="captions-indicator indicator">
    <path d="M22.83 5.68a2.58 2.58 0 0 0-2.3-2.5c-3.62-.24-11.44-.24-15.06 0a2.58 2.58 0 0 0-2.3 2.5c-.23 4.21-.23 8.43 0 12.64a2.58 2.58 0 0 0 2.3 2.5c3.62.24 11.44.24 15.06 0a2.58 2.58 0 0 0 2.3-2.5c.23-4.21.23-8.43 0-12.64Zm-11.39 9.45a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.92 3.92 0 0 1 .92-2.77 3.18 3.18 0 0 1 2.43-1 2.94 2.94 0 0 1 2.13.78c.364.359.62.813.74 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.17 1.61 1.61 0 0 0-1.29.58 2.79 2.79 0 0 0-.5 1.89 3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.48 1.48 0 0 0 1-.37 2.1 2.1 0 0 0 .59-1.14l1.4.44a3.23 3.23 0 0 1-1.07 1.69Zm7.22 0a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.88 3.88 0 0 1 .93-2.77 3.14 3.14 0 0 1 2.42-1 3 3 0 0 1 2.16.82 2.8 2.8 0 0 1 .73 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.21 1.61 1.61 0 0 0-1.29.58A2.79 2.79 0 0 0 15 12a3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.44 1.44 0 0 0 1-.37 2.1 2.1 0 0 0 .6-1.15l1.4.44a3.17 3.17 0 0 1-1.1 1.7Z"/>
  </svg>`;function $T(t){return`
    ${ht.getTemplateHTML(t)}
    <slot name="captions-indicator" hidden>${PT}</slot>
  `}class df extends ht{constructor(){super(...arguments),$l(this,no),$l(this,so),$l(this,qo,void 0)}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_SUBTITLES_LIST,c.MEDIA_SUBTITLES_SHOWING]}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_SUBTITLES_LIST&&i!==a?ns(this,no,Zd).call(this):e===c.MEDIA_SUBTITLES_SHOWING&&i!==a&&(this.value=a||"",ns(this,no,Zd).call(this))}connectedCallback(){super.connectedCallback(),this.addEventListener("change",ns(this,so,Xd))}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("change",ns(this,so,Xd))}get anchorElement(){return this.anchor!=="auto"?super.anchorElement:Ye(this).querySelector("media-captions-menu-button")}get mediaSubtitlesList(){return sm(this,c.MEDIA_SUBTITLES_LIST)}set mediaSubtitlesList(e){om(this,c.MEDIA_SUBTITLES_LIST,e)}get mediaSubtitlesShowing(){return sm(this,c.MEDIA_SUBTITLES_SHOWING)}set mediaSubtitlesShowing(e){om(this,c.MEDIA_SUBTITLES_SHOWING,e)}}qo=new WeakMap;no=new WeakSet;Zd=function(){var t;const e=xT(this,qo)!==JSON.stringify(this.mediaSubtitlesList),i=this.value!==this.getAttribute(c.MEDIA_SUBTITLES_SHOWING);if(!e&&!i)return;NT(this,qo,JSON.stringify(this.mediaSubtitlesList)),this.defaultSlot.textContent="";const a=!this.value,r=fr({type:"radio",text:this.formatMenuItemText(R("Off")),value:"off",checked:a});r.prepend(pa(this,"checked-indicator")),this.defaultSlot.append(r);const n=this.mediaSubtitlesList;for(const s of n){const o=fr({type:"radio",text:this.formatMenuItemText(s.label,s),value:sd(s),checked:this.value==sd(s)});o.prepend(pa(this,"checked-indicator")),((t=s.kind)!=null?t:"subs")==="captions"&&o.append(pa(this,"captions-indicator")),this.defaultSlot.append(o)}};so=new WeakSet;Xd=function(){const t=this.mediaSubtitlesShowing,e=this.getAttribute(c.MEDIA_SUBTITLES_SHOWING),i=this.value!==e;if(t?.length&&i&&this.dispatchEvent(new _.CustomEvent(L.MEDIA_DISABLE_SUBTITLES_REQUEST,{composed:!0,bubbles:!0,detail:t})),!this.value||!i)return;const a=new _.CustomEvent(L.MEDIA_SHOW_SUBTITLES_REQUEST,{composed:!0,bubbles:!0,detail:this.value});this.dispatchEvent(a)};df.getTemplateHTML=$T;const sm=(t,e)=>{const i=t.getAttribute(e);return i?ol(i):[]},om=(t,e,i)=>{if(!i?.length){t.removeAttribute(e);return}const a=Cn(i);t.getAttribute(e)!==a&&t.setAttribute(e,a)};_.customElements.get("media-captions-menu")||_.customElements.define("media-captions-menu",df);const UT=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M22.83 5.68a2.58 2.58 0 0 0-2.3-2.5c-3.62-.24-11.44-.24-15.06 0a2.58 2.58 0 0 0-2.3 2.5c-.23 4.21-.23 8.43 0 12.64a2.58 2.58 0 0 0 2.3 2.5c3.62.24 11.44.24 15.06 0a2.58 2.58 0 0 0 2.3-2.5c.23-4.21.23-8.43 0-12.64Zm-11.39 9.45a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.92 3.92 0 0 1 .92-2.77 3.18 3.18 0 0 1 2.43-1 2.94 2.94 0 0 1 2.13.78c.364.359.62.813.74 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.17 1.61 1.61 0 0 0-1.29.58 2.79 2.79 0 0 0-.5 1.89 3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.48 1.48 0 0 0 1-.37 2.1 2.1 0 0 0 .59-1.14l1.4.44a3.23 3.23 0 0 1-1.07 1.69Zm7.22 0a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.88 3.88 0 0 1 .93-2.77 3.14 3.14 0 0 1 2.42-1 3 3 0 0 1 2.16.82 2.8 2.8 0 0 1 .73 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.21 1.61 1.61 0 0 0-1.29.58A2.79 2.79 0 0 0 15 12a3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.44 1.44 0 0 0 1-.37 2.1 2.1 0 0 0 .6-1.15l1.4.44a3.17 3.17 0 0 1-1.1 1.7Z"/>
</svg>`,HT=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M17.73 14.09a1.4 1.4 0 0 1-1 .37 1.579 1.579 0 0 1-1.27-.58A3 3 0 0 1 15 12a2.8 2.8 0 0 1 .5-1.85 1.63 1.63 0 0 1 1.29-.57 1.47 1.47 0 0 1 1.51 1.2l1.43-.34A2.89 2.89 0 0 0 19 9.07a3 3 0 0 0-2.14-.78 3.14 3.14 0 0 0-2.42 1 3.91 3.91 0 0 0-.93 2.78 3.74 3.74 0 0 0 .92 2.66 3.07 3.07 0 0 0 2.34 1 3.07 3.07 0 0 0 1.91-.57 3.17 3.17 0 0 0 1.07-1.74l-1.4-.45c-.083.43-.3.822-.62 1.12Zm-7.22 0a1.43 1.43 0 0 1-1 .37 1.58 1.58 0 0 1-1.27-.58A3 3 0 0 1 7.76 12a2.8 2.8 0 0 1 .5-1.85 1.63 1.63 0 0 1 1.29-.57 1.47 1.47 0 0 1 1.51 1.2l1.43-.34a2.81 2.81 0 0 0-.74-1.32 2.94 2.94 0 0 0-2.13-.78 3.18 3.18 0 0 0-2.43 1 4 4 0 0 0-.92 2.78 3.74 3.74 0 0 0 .92 2.66 3.07 3.07 0 0 0 2.34 1 3.07 3.07 0 0 0 1.91-.57 3.23 3.23 0 0 0 1.07-1.74l-1.4-.45a2.06 2.06 0 0 1-.6 1.07Zm12.32-8.41a2.59 2.59 0 0 0-2.3-2.51C18.72 3.05 15.86 3 13 3c-2.86 0-5.72.05-7.53.17a2.59 2.59 0 0 0-2.3 2.51c-.23 4.207-.23 8.423 0 12.63a2.57 2.57 0 0 0 2.3 2.5c1.81.13 4.67.19 7.53.19 2.86 0 5.72-.06 7.53-.19a2.57 2.57 0 0 0 2.3-2.5c.23-4.207.23-8.423 0-12.63Zm-1.49 12.53a1.11 1.11 0 0 1-.91 1.11c-1.67.11-4.45.18-7.43.18-2.98 0-5.76-.07-7.43-.18a1.11 1.11 0 0 1-.91-1.11c-.21-4.14-.21-8.29 0-12.43a1.11 1.11 0 0 1 .91-1.11C7.24 4.56 10 4.49 13 4.49s5.76.07 7.43.18a1.11 1.11 0 0 1 .91 1.11c.21 4.14.21 8.29 0 12.43Z"/>
</svg>`;function BT(){return`
    <style>
      :host([data-captions-enabled="true"]) slot[name=off] {
        display: none !important;
      }

      
      :host(:not([data-captions-enabled="true"])) slot[name=on] {
        display: none !important;
      }

      :host([aria-expanded="true"]) slot[name=tooltip] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="on">${UT}</slot>
      <slot name="off">${HT}</slot>
    </slot>
  `}function WT(){return R("Captions")}const lm=t=>{t.setAttribute("data-captions-enabled",Gp(t).toString())},dm=t=>{t.setAttribute("aria-label",R("closed captions"))};class wc extends Tr{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_SUBTITLES_LIST,c.MEDIA_SUBTITLES_SHOWING,c.MEDIA_LANG]}connectedCallback(){super.connectedCallback(),dm(this),lm(this)}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_SUBTITLES_SHOWING?lm(this):e===c.MEDIA_LANG&&dm(this)}get invokeTargetElement(){var e;return this.invokeTarget!=null?super.invokeTargetElement:(e=Ye(this))==null?void 0:e.querySelector("media-captions-menu")}get mediaSubtitlesList(){return um(this,c.MEDIA_SUBTITLES_LIST)}set mediaSubtitlesList(e){cm(this,c.MEDIA_SUBTITLES_LIST,e)}get mediaSubtitlesShowing(){return um(this,c.MEDIA_SUBTITLES_SHOWING)}set mediaSubtitlesShowing(e){cm(this,c.MEDIA_SUBTITLES_SHOWING,e)}}wc.getSlotTemplateHTML=BT;wc.getTooltipContentHTML=WT;const um=(t,e)=>{const i=t.getAttribute(e);return i?ol(i):[]},cm=(t,e,i)=>{if(!i?.length){t.removeAttribute(e);return}const a=Cn(i);t.getAttribute(e)!==a&&t.setAttribute(e,a)};_.customElements.get("media-captions-menu-button")||_.customElements.define("media-captions-menu-button",wc);var uf=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},qa=(t,e,i)=>(uf(t,e,"read from private field"),i?i.call(t):e.get(t)),Ul=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},ka=(t,e,i)=>(uf(t,e,"access private method"),i),Oi,Ya,nn,oo,Jd;const Hl={RATES:"rates"};class FT extends ht{constructor(){super(),Ul(this,Ya),Ul(this,oo),Ul(this,Oi,new Du(this,Hl.RATES,{defaultValue:Sv})),ka(this,Ya,nn).call(this)}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PLAYBACK_RATE,Hl.RATES]}attributeChangedCallback(e,i,a){super.attributeChangedCallback(e,i,a),e===c.MEDIA_PLAYBACK_RATE&&i!=a?(this.value=a,ka(this,Ya,nn).call(this)):e===Hl.RATES&&i!=a&&(qa(this,Oi).value=a,ka(this,Ya,nn).call(this))}connectedCallback(){super.connectedCallback(),this.addEventListener("change",ka(this,oo,Jd))}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("change",ka(this,oo,Jd))}get anchorElement(){return this.anchor!=="auto"?super.anchorElement:Ye(this).querySelector("media-playback-rate-menu-button")}get rates(){return qa(this,Oi)}set rates(e){e?Array.isArray(e)?qa(this,Oi).value=e.join(" "):typeof e=="string"&&(qa(this,Oi).value=e):qa(this,Oi).value="",ka(this,Ya,nn).call(this)}get mediaPlaybackRate(){return ie(this,c.MEDIA_PLAYBACK_RATE,Xa)}set mediaPlaybackRate(e){ce(this,c.MEDIA_PLAYBACK_RATE,e)}}Oi=new WeakMap;Ya=new WeakSet;nn=function(){this.defaultSlot.textContent="";const t=Wi(this.mediaPlaybackRate),e=new Set(Array.from(qa(this,Oi)).map(a=>Wi(Number(a))));t>0&&!e.has(t)&&e.add(t);const i=Array.from(e).sort((a,r)=>a-r);for(const a of i){const r=fr({type:"radio",text:this.formatMenuItemText(`${a}x`,a),value:a.toString(),checked:t===a});r.prepend(pa(this,"checked-indicator")),this.defaultSlot.append(r)}};oo=new WeakSet;Jd=function(){if(!this.value)return;const t=new _.CustomEvent(L.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:this.value});this.dispatchEvent(t)};_.customElements.get("media-playback-rate-menu")||_.customElements.define("media-playback-rate-menu",FT);const lo=1;function KT(t){return`
    <style>
      :host {
        min-width: 5ch;
        padding: var(--media-button-padding, var(--media-control-padding, 10px 5px));
      }

      :host([aria-expanded="true"]) slot {
        display: block;
      }

      :host([aria-expanded="true"]) slot[name=tooltip] {
        display: none;
      }
    </style>
    <slot name="icon">${t.mediaplaybackrate?Wi(+t.mediaplaybackrate):lo}x</slot>
  `}function VT(){return R("Playback rate")}class Ic extends Tr{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_PLAYBACK_RATE]}constructor(){var e;super(),this.container=this.shadowRoot.querySelector('slot[name="icon"]'),this.container.innerHTML=`${Wi((e=this.mediaPlaybackRate)!=null?e:lo)}x`}attributeChangedCallback(e,i,a){if(super.attributeChangedCallback(e,i,a),e===c.MEDIA_PLAYBACK_RATE){const r=a?+a:Number.NaN,n=Wi(Number.isNaN(r)?lo:r);this.container.innerHTML=`${n}x`,this.setAttribute("aria-label",R("Playback rate {playbackRate}",{playbackRate:n}))}}get invokeTargetElement(){return this.invokeTarget!=null?super.invokeTargetElement:Ye(this).querySelector("media-playback-rate-menu")}get mediaPlaybackRate(){return ie(this,c.MEDIA_PLAYBACK_RATE,lo)}set mediaPlaybackRate(e){ce(this,c.MEDIA_PLAYBACK_RATE,e)}}Ic.getSlotTemplateHTML=KT;Ic.getTooltipContentHTML=VT;_.customElements.get("media-playback-rate-menu-button")||_.customElements.define("media-playback-rate-menu-button",Ic);var Rc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},ni=(t,e,i)=>(Rc(t,e,"read from private field"),i?i.call(t):e.get(t)),ss=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},hm=(t,e,i,a)=>(Rc(t,e,"write to private field"),e.set(t,i),i),Sa=(t,e,i)=>(Rc(t,e,"access private method"),i),sn,Kt,Ga,on,uo,eu;class qT extends ht{constructor(){super(...arguments),ss(this,Ga),ss(this,uo),ss(this,sn,[]),ss(this,Kt,{})}static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_RENDITION_LIST,c.MEDIA_RENDITION_SELECTED,c.MEDIA_RENDITION_UNAVAILABLE,c.MEDIA_HEIGHT,c.MEDIA_WIDTH]}static formatMenuItemText(e,i){return super.formatMenuItemText(e,i)}static formatRendition(e,{showBitrate:i=!1}={}){const a=`${Math.min(e.width,e.height)}p`;if(i&&e.bitrate){const r=e.bitrate/1e6,n=`${r.toFixed(r<1?1:0)} Mbps`;return`${a} (${n})`}return this.formatMenuItemText(a,e)}static compareRendition(e,i){var a,r;return i.height===e.height?((a=i.bitrate)!=null?a:0)-((r=e.bitrate)!=null?r:0):i.height-e.height}attributeChangedCallback(e,i,a){if(super.attributeChangedCallback(e,i,a),i!==a)switch(e){case c.MEDIA_RENDITION_SELECTED:this.value=a??"auto",Sa(this,Ga,on).call(this);break;case c.MEDIA_RENDITION_LIST:hm(this,sn,s0(a)),Sa(this,Ga,on).call(this);break;case c.MEDIA_HEIGHT:case c.MEDIA_WIDTH:Sa(this,Ga,on).call(this);break}}connectedCallback(){super.connectedCallback(),this.addEventListener("change",Sa(this,uo,eu))}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("change",Sa(this,uo,eu))}get anchorElement(){return this.anchor!=="auto"?super.anchorElement:Ye(this).querySelector("media-rendition-menu-button")}get mediaRenditionList(){return ni(this,sn)}set mediaRenditionList(e){hm(this,sn,e),Sa(this,Ga,on).call(this)}get mediaRenditionSelected(){return oe(this,c.MEDIA_RENDITION_SELECTED)}set mediaRenditionSelected(e){ae(this,c.MEDIA_RENDITION_SELECTED,e)}get mediaHeight(){return ie(this,c.MEDIA_HEIGHT)}set mediaHeight(e){ce(this,c.MEDIA_HEIGHT,e)}get mediaWidth(){return ie(this,c.MEDIA_WIDTH)}set mediaWidth(e){ce(this,c.MEDIA_WIDTH,e)}compareRendition(e,i){return this.constructor.compareRendition(e,i)}formatMenuItemText(e,i){return this.constructor.formatMenuItemText(e,i)}formatRendition(e,i){return this.constructor.formatRendition(e,i)}showRenditionBitrate(e){return this.mediaRenditionList.some(i=>i!==e&&i.height===e.height&&i.bitrate!==e.bitrate)}}sn=new WeakMap;Kt=new WeakMap;Ga=new WeakSet;on=function(){const t=!this.mediaRenditionSelected;if(ni(this,Kt).mediaRenditionList===JSON.stringify(this.mediaRenditionList)&&ni(this,Kt).mediaHeight===this.mediaHeight&&ni(this,Kt).mediaWidth===this.mediaWidth&&ni(this,Kt).isAuto===t)return;ni(this,Kt).mediaRenditionList=JSON.stringify(this.mediaRenditionList),ni(this,Kt).mediaHeight=this.mediaHeight,ni(this,Kt).mediaWidth=this.mediaWidth,ni(this,Kt).isAuto=t;const e=this.mediaRenditionList.sort(this.compareRendition.bind(this)),i=e.find(s=>s.id===this.mediaRenditionSelected);for(const s of e)s.selected=s===i;this.defaultSlot.textContent="";for(const s of e){const o=this.formatRendition(s,{showBitrate:this.showRenditionBitrate(s)}),l=fr({type:"radio",text:o,value:`${s.id}`,checked:s.selected&&!t});l.prepend(pa(this,"checked-indicator")),this.defaultSlot.append(l)}const a=i&&this.showRenditionBitrate(i);let r;t&&(i?r=this.formatMenuItemText(`${R("Auto")} • ${this.formatRendition(i,{showBitrate:a})}`,i):this.mediaHeight>0&&this.mediaWidth>0&&(r=this.formatMenuItemText(`${R("Auto")} (${Math.min(this.mediaWidth,this.mediaHeight)}p)`))),r||(r=this.formatMenuItemText(R("Auto")));const n=fr({type:"radio",text:r,value:"auto",checked:t});n.dataset.description=r,n.prepend(pa(this,"checked-indicator")),this.defaultSlot.append(n)};uo=new WeakSet;eu=function(){if(this.value==null)return;const t=new _.CustomEvent(L.MEDIA_RENDITION_REQUEST,{composed:!0,bubbles:!0,detail:this.value});this.dispatchEvent(t)};_.customElements.get("media-rendition-menu")||_.customElements.define("media-rendition-menu",qT);const YT=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M13.5 2.5h2v6h-2v-2h-11v-2h11v-2Zm4 2h4v2h-4v-2Zm-12 4h2v6h-2v-2h-3v-2h3v-2Zm4 2h12v2h-12v-2Zm1 4h2v6h-2v-2h-8v-2h8v-2Zm4 2h7v2h-7v-2Z" />
</svg>`;function GT(){return`
    <style>
      :host([aria-expanded="true"]) slot[name=tooltip] {
        display: none;
      }
    </style>
    <slot name="icon">${YT}</slot>
  `}function zT(){return R("Quality")}class Lc extends Tr{static get observedAttributes(){return[...super.observedAttributes,c.MEDIA_RENDITION_SELECTED,c.MEDIA_RENDITION_UNAVAILABLE,c.MEDIA_HEIGHT]}connectedCallback(){super.connectedCallback(),this.setAttribute("aria-label",R("quality"))}get invokeTargetElement(){return this.invokeTarget!=null?super.invokeTargetElement:Ye(this).querySelector("media-rendition-menu")}get mediaRenditionSelected(){return oe(this,c.MEDIA_RENDITION_SELECTED)}set mediaRenditionSelected(e){ae(this,c.MEDIA_RENDITION_SELECTED,e)}get mediaHeight(){return ie(this,c.MEDIA_HEIGHT)}set mediaHeight(e){ce(this,c.MEDIA_HEIGHT,e)}}Lc.getSlotTemplateHTML=GT;Lc.getTooltipContentHTML=zT;_.customElements.get("media-rendition-menu-button")||_.customElements.define("media-rendition-menu-button",Lc);var Cc=(t,e,i)=>{if(!e.has(t))throw TypeError("Cannot "+i)},Vt=(t,e,i)=>(Cc(t,e,"read from private field"),i?i.call(t):e.get(t)),Dt=(t,e,i)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,i)},cf=(t,e,i,a)=>(Cc(t,e,"write to private field"),e.set(t,i),i),lt=(t,e,i)=>(Cc(t,e,"access private method"),i),Er,Un,El,na,er,Dc,hf,co,tu,ho,iu,mf,Yo,Go,mo;function QT(t){return`
      ${ht.getTemplateHTML(t)}
      <style>
        :host {
          --_menu-bg: rgb(20 20 30 / .8);
          background: var(--media-settings-menu-background,
            var(--media-menu-background,
              var(--media-control-background,
                var(--media-secondary-color, var(--_menu-bg)))));
          min-width: var(--media-settings-menu-min-width, 170px);
          border-radius: 2px;
          overflow: hidden;
        }
      </style>
    `}class pf extends ht{constructor(){super(),Dt(this,Un),Dt(this,na),Dt(this,Dc),Dt(this,co),Dt(this,iu),Dt(this,Er,!1),Dt(this,ho,e=>{const i=e.target,a=i?.nodeName==="VIDEO",r=lt(this,co,tu).call(this,i);(a||r)&&(Vt(this,Er)?lt(this,na,er).call(this):lt(this,iu,mf).call(this,e))}),Dt(this,Yo,e=>{const i=e.target,a=this.contains(i),r=e.button===2,n=i?.nodeName==="VIDEO",s=lt(this,co,tu).call(this,i);a||r&&(n||s)||lt(this,na,er).call(this)}),Dt(this,Go,e=>{e.key==="Escape"&&lt(this,na,er).call(this)}),Dt(this,mo,e=>{var i,a;const r=e.target;if((i=r.matches)!=null&&i.call(r,'button[invoke="copy"]')){const n=(a=r.closest("media-context-menu-item"))==null?void 0:a.querySelector('input[slot="copy"]');n&&navigator.clipboard.writeText(n.value)}lt(this,na,er).call(this)}),this.setAttribute("noautohide",""),lt(this,Un,El).call(this)}connectedCallback(){super.connectedCallback(),Ye(this).addEventListener("contextmenu",Vt(this,ho)),this.addEventListener("click",Vt(this,mo))}disconnectedCallback(){super.disconnectedCallback(),Ye(this).removeEventListener("contextmenu",Vt(this,ho)),this.removeEventListener("click",Vt(this,mo)),document.removeEventListener("mousedown",Vt(this,Yo)),document.removeEventListener("keydown",Vt(this,Go))}}Er=new WeakMap;Un=new WeakSet;El=function(){this.hidden=!Vt(this,Er)};na=new WeakSet;er=function(){cf(this,Er,!1),lt(this,Un,El).call(this)};Dc=new WeakSet;hf=function(){document.querySelectorAll("media-context-menu").forEach(e=>{var i;e!==this&&lt(i=e,na,er).call(i)})};co=new WeakSet;tu=function(t){return t?t.hasAttribute("slot")&&t.getAttribute("slot")==="media"?!0:t.nodeName.includes("-")&&t.tagName.includes("-")?t.hasAttribute("src")||t.hasAttribute("poster")||t.hasAttribute("preload")||t.hasAttribute("playsinline"):!1:!1};ho=new WeakMap;iu=new WeakSet;mf=function(t){t.preventDefault(),lt(this,Dc,hf).call(this),cf(this,Er,!0),this.style.position="fixed",this.style.left=`${t.clientX}px`,this.style.top=`${t.clientY}px`,lt(this,Un,El).call(this),document.addEventListener("mousedown",Vt(this,Yo),{once:!0}),document.addEventListener("keydown",Vt(this,Go),{once:!0})};Yo=new WeakMap;Go=new WeakMap;mo=new WeakMap;pf.getTemplateHTML=QT;_.customElements.get("media-context-menu")||_.customElements.define("media-context-menu",pf);function jT(t){return`
    ${Ki.getTemplateHTML.call(this,t)}
    <style>
        ::slotted(*) {
            color: var(--media-text-color, white);
            text-decoration: none;
            border: none;
            background: none;
            cursor: pointer;
            padding: 0;
            min-height: var(--media-control-height, 24px);
        }
    </style>
  `}class Mc extends Ki{}Mc.shadowRootOptions={mode:"open"};Mc.getTemplateHTML=jT;_.customElements.get("media-context-menu-item")||_.customElements.define("media-context-menu-item",Mc);var vf=t=>{throw TypeError(t)},Oc=(t,e,i)=>e.has(t)||vf("Cannot "+i),H=(t,e,i)=>(Oc(t,e,"read from private field"),i?i.call(t):e.get(t)),xe=(t,e,i)=>e.has(t)?vf("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,i),qe=(t,e,i,a)=>(Oc(t,e,"write to private field"),e.set(t,i),i),me=(t,e,i)=>(Oc(t,e,"access private method"),i),_l=class{addEventListener(){}removeEventListener(){}dispatchEvent(t){return!0}};if(typeof DocumentFragment>"u"){class t extends _l{}globalThis.DocumentFragment=t}var xc=class extends _l{},ZT=class extends _l{},XT={get(t){},define(t,e,i){},getName(t){return null},upgrade(t){},whenDefined(t){return Promise.resolve(xc)}},po,JT=class{constructor(t,e={}){xe(this,po),qe(this,po,e?.detail)}get detail(){return H(this,po)}initCustomEvent(){}};po=new WeakMap;function eA(t,e){return new xc}var ff={document:{createElement:eA},DocumentFragment,customElements:XT,CustomEvent:JT,EventTarget:_l,HTMLElement:xc,HTMLVideoElement:ZT},Ef=typeof window>"u"||typeof globalThis.customElements>"u",Yt=Ef?ff:globalThis,zo=Ef?ff.document:globalThis.document;function tA(t){let e="";return Object.entries(t).forEach(([i,a])=>{a!=null&&(e+=`${au(i)}: ${a}; `)}),e?e.trim():void 0}function au(t){return t.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase()}function _f(t){return t.replace(/[-_]([a-z])/g,(e,i)=>i.toUpperCase())}function Ue(t){if(t==null)return;let e=+t;return Number.isNaN(e)?void 0:e}function bf(t){let e=iA(t).toString();return e?"?"+e:""}function iA(t){let e={};for(let i in t)t[i]!=null&&(e[i]=t[i]);return new URLSearchParams(e)}var gf=(t,e)=>!t||!e?!1:t.contains(e)?!0:gf(t,e.getRootNode().host),yf="mux.com",aA=()=>{try{return"3.13.0"}catch{}return"UNKNOWN"},rA=aA(),Tf=()=>rA,nA=(t,{token:e,customDomain:i=yf,thumbnailTime:a,programTime:r}={})=>{var n;let s=e==null?a:void 0,{aud:o}=(n=tr(e))!=null?n:{};if(!(e&&o!=="t"))return`https://image.${i}/${t}/thumbnail.webp${bf({token:e,time:s,program_time:r})}`},sA=(t,{token:e,customDomain:i=yf,programStartTime:a,programEndTime:r}={})=>{var n;let{aud:s}=(n=tr(e))!=null?n:{};if(!(e&&s!=="s"))return`https://image.${i}/${t}/storyboard.vtt${bf({token:e,format:"webp",program_start_time:a,program_end_time:r})}`},Nc=t=>{if(t){if([j.LIVE,j.ON_DEMAND].includes(t))return t;if(t!=null&&t.includes("live"))return j.LIVE}},oA={crossorigin:"crossOrigin",playsinline:"playsInline"};function lA(t){var e;return(e=oA[t])!=null?e:_f(t)}var za,Qa,Ve,dA=class{constructor(t,e){xe(this,za),xe(this,Qa),xe(this,Ve,[]),qe(this,za,t),qe(this,Qa,e)}[Symbol.iterator](){return H(this,Ve).values()}get length(){return H(this,Ve).length}get value(){var t;return(t=H(this,Ve).join(" "))!=null?t:""}set value(t){var e;t!==this.value&&(qe(this,Ve,[]),this.add(...(e=t?.split(" "))!=null?e:[]))}toString(){return this.value}item(t){return H(this,Ve)[t]}values(){return H(this,Ve).values()}keys(){return H(this,Ve).keys()}forEach(t){H(this,Ve).forEach(t)}add(...t){var e,i;t.forEach(a=>{this.contains(a)||H(this,Ve).push(a)}),!(this.value===""&&!((e=H(this,za))!=null&&e.hasAttribute(`${H(this,Qa)}`)))&&((i=H(this,za))==null||i.setAttribute(`${H(this,Qa)}`,`${this.value}`))}remove(...t){var e;t.forEach(i=>{H(this,Ve).splice(H(this,Ve).indexOf(i),1)}),(e=H(this,za))==null||e.setAttribute(`${H(this,Qa)}`,`${this.value}`)}contains(t){return H(this,Ve).includes(t)}toggle(t,e){return typeof e<"u"?e?(this.add(t),!0):(this.remove(t),!1):this.contains(t)?(this.remove(t),!1):(this.add(t),!0)}replace(t,e){this.remove(t),this.add(e)}};za=new WeakMap,Qa=new WeakMap,Ve=new WeakMap;var Af=`[mux-player ${Tf()}]`;function si(...t){console.warn(Af,...t)}function et(...t){console.error(Af,...t)}function mm(t){var e;let i=(e=t.message)!=null?e:"";t.context&&(i+=` ${t.context}`),t.file&&(i+=` ${O("Read more: ")}
https://github.com/muxinc/elements/blob/main/errors/${t.file}`),si(i)}var $e={AUTOPLAY:"autoplay",CROSSORIGIN:"crossorigin",LOOP:"loop",MUTED:"muted",PLAYSINLINE:"playsinline",PRELOAD:"preload"},ia={VOLUME:"volume",PLAYBACKRATE:"playbackrate",MUTED:"muted"},pm=Object.freeze({length:0,start(t){let e=t>>>0;if(e>=this.length)throw new DOMException(`Failed to execute 'start' on 'TimeRanges': The index provided (${e}) is greater than or equal to the maximum bound (${this.length}).`);return 0},end(t){let e=t>>>0;if(e>=this.length)throw new DOMException(`Failed to execute 'end' on 'TimeRanges': The index provided (${e}) is greater than or equal to the maximum bound (${this.length}).`);return 0}}),uA=Object.values($e).filter(t=>$e.PLAYSINLINE!==t),cA=Object.values(ia),hA=[...uA,...cA],mA=class extends Yt.HTMLElement{static get observedAttributes(){return hA}constructor(){super()}attributeChangedCallback(t,e,i){var a,r;switch(t){case ia.MUTED:{this.media&&(this.media.muted=i!=null,this.media.defaultMuted=i!=null);return}case ia.VOLUME:{let n=(a=Ue(i))!=null?a:1;this.media&&(this.media.volume=n);return}case ia.PLAYBACKRATE:{let n=(r=Ue(i))!=null?r:1;this.media&&(this.media.playbackRate=n,this.media.defaultPlaybackRate=n);return}}}play(){var t,e;return(e=(t=this.media)==null?void 0:t.play())!=null?e:Promise.reject()}pause(){var t;(t=this.media)==null||t.pause()}load(){var t;(t=this.media)==null||t.load()}get media(){var t;return(t=this.shadowRoot)==null?void 0:t.querySelector("mux-video")}get audioTracks(){return this.media.audioTracks}get videoTracks(){return this.media.videoTracks}get audioRenditions(){return this.media.audioRenditions}get videoRenditions(){return this.media.videoRenditions}get paused(){var t,e;return(e=(t=this.media)==null?void 0:t.paused)!=null?e:!0}get duration(){var t,e;return(e=(t=this.media)==null?void 0:t.duration)!=null?e:NaN}get ended(){var t,e;return(e=(t=this.media)==null?void 0:t.ended)!=null?e:!1}get buffered(){var t,e;return(e=(t=this.media)==null?void 0:t.buffered)!=null?e:pm}get seekable(){var t,e;return(e=(t=this.media)==null?void 0:t.seekable)!=null?e:pm}get readyState(){var t,e;return(e=(t=this.media)==null?void 0:t.readyState)!=null?e:0}get videoWidth(){var t,e;return(e=(t=this.media)==null?void 0:t.videoWidth)!=null?e:0}get videoHeight(){var t,e;return(e=(t=this.media)==null?void 0:t.videoHeight)!=null?e:0}get currentSrc(){var t,e;return(e=(t=this.media)==null?void 0:t.currentSrc)!=null?e:""}get currentTime(){var t,e;return(e=(t=this.media)==null?void 0:t.currentTime)!=null?e:0}set currentTime(t){this.media&&(this.media.currentTime=Number(t))}get volume(){var t,e;return(e=(t=this.media)==null?void 0:t.volume)!=null?e:1}set volume(t){this.media&&(this.media.volume=Number(t))}get playbackRate(){var t,e;return(e=(t=this.media)==null?void 0:t.playbackRate)!=null?e:1}set playbackRate(t){this.media&&(this.media.playbackRate=Number(t))}get defaultPlaybackRate(){var t;return(t=Ue(this.getAttribute(ia.PLAYBACKRATE)))!=null?t:1}set defaultPlaybackRate(t){t!=null?this.setAttribute(ia.PLAYBACKRATE,`${t}`):this.removeAttribute(ia.PLAYBACKRATE)}get crossOrigin(){return xr(this,$e.CROSSORIGIN)}set crossOrigin(t){this.setAttribute($e.CROSSORIGIN,`${t}`)}get autoplay(){return xr(this,$e.AUTOPLAY)!=null}set autoplay(t){t?this.setAttribute($e.AUTOPLAY,typeof t=="string"?t:""):this.removeAttribute($e.AUTOPLAY)}get loop(){return xr(this,$e.LOOP)!=null}set loop(t){t?this.setAttribute($e.LOOP,""):this.removeAttribute($e.LOOP)}get muted(){var t,e;return(e=(t=this.media)==null?void 0:t.muted)!=null?e:!1}set muted(t){this.media&&(this.media.muted=!!t)}get defaultMuted(){return xr(this,$e.MUTED)!=null}set defaultMuted(t){t?this.setAttribute($e.MUTED,""):this.removeAttribute($e.MUTED)}get playsInline(){return xr(this,$e.PLAYSINLINE)!=null}set playsInline(t){et("playsInline is set to true by default and is not currently supported as a setter.")}get preload(){return this.media?this.media.preload:this.getAttribute("preload")}set preload(t){["","none","metadata","auto"].includes(t)?this.setAttribute($e.PRELOAD,t):this.removeAttribute($e.PRELOAD)}};function xr(t,e){return t.media?t.media.getAttribute(e):t.getAttribute(e)}var vm=mA,pA=`:host {
  --media-control-display: var(--controls);
  --media-loading-indicator-display: var(--loading-indicator);
  --media-dialog-display: var(--dialog);
  --media-play-button-display: var(--play-button);
  --media-live-button-display: var(--live-button);
  --media-seek-backward-button-display: var(--seek-backward-button);
  --media-seek-forward-button-display: var(--seek-forward-button);
  --media-mute-button-display: var(--mute-button);
  --media-captions-button-display: var(--captions-button);
  --media-captions-menu-button-display: var(--captions-menu-button, var(--media-captions-button-display));
  --media-rendition-menu-button-display: var(--rendition-menu-button);
  --media-audio-track-menu-button-display: var(--audio-track-menu-button);
  --media-airplay-button-display: var(--airplay-button);
  --media-pip-button-display: var(--pip-button);
  --media-fullscreen-button-display: var(--fullscreen-button);
  --media-cast-button-display: var(--cast-button, var(--_cast-button-drm-display));
  --media-playback-rate-button-display: var(--playback-rate-button);
  --media-playback-rate-menu-button-display: var(--playback-rate-menu-button);
  --media-volume-range-display: var(--volume-range);
  --media-time-range-display: var(--time-range);
  --media-time-display-display: var(--time-display);
  --media-duration-display-display: var(--duration-display);
  --media-title-display-display: var(--title-display);

  display: inline-block;
  line-height: 0;
  width: 100%;
}

a {
  color: #fff;
  font-size: 0.9em;
  text-decoration: underline;
}

media-theme {
  display: inline-block;
  line-height: 0;
  width: 100%;
  height: 100%;
  direction: ltr;
}

media-poster-image {
  display: inline-block;
  line-height: 0;
  width: 100%;
  height: 100%;
}

media-poster-image:not([src]):not([placeholdersrc]) {
  display: none;
}

::part(top),
[part~='top'] {
  --media-control-display: var(--controls, var(--top-controls));
  --media-play-button-display: var(--play-button, var(--top-play-button));
  --media-live-button-display: var(--live-button, var(--top-live-button));
  --media-seek-backward-button-display: var(--seek-backward-button, var(--top-seek-backward-button));
  --media-seek-forward-button-display: var(--seek-forward-button, var(--top-seek-forward-button));
  --media-mute-button-display: var(--mute-button, var(--top-mute-button));
  --media-captions-button-display: var(--captions-button, var(--top-captions-button));
  --media-captions-menu-button-display: var(
    --captions-menu-button,
    var(--media-captions-button-display, var(--top-captions-menu-button))
  );
  --media-rendition-menu-button-display: var(--rendition-menu-button, var(--top-rendition-menu-button));
  --media-audio-track-menu-button-display: var(--audio-track-menu-button, var(--top-audio-track-menu-button));
  --media-airplay-button-display: var(--airplay-button, var(--top-airplay-button));
  --media-pip-button-display: var(--pip-button, var(--top-pip-button));
  --media-fullscreen-button-display: var(--fullscreen-button, var(--top-fullscreen-button));
  --media-cast-button-display: var(--cast-button, var(--top-cast-button, var(--_cast-button-drm-display)));
  --media-playback-rate-button-display: var(--playback-rate-button, var(--top-playback-rate-button));
  --media-playback-rate-menu-button-display: var(
    --captions-menu-button,
    var(--media-playback-rate-button-display, var(--top-playback-rate-menu-button))
  );
  --media-volume-range-display: var(--volume-range, var(--top-volume-range));
  --media-time-range-display: var(--time-range, var(--top-time-range));
  --media-time-display-display: var(--time-display, var(--top-time-display));
  --media-duration-display-display: var(--duration-display, var(--top-duration-display));
  --media-title-display-display: var(--title-display, var(--top-title-display));
}

::part(center),
[part~='center'] {
  --media-control-display: var(--controls, var(--center-controls));
  --media-play-button-display: var(--play-button, var(--center-play-button));
  --media-live-button-display: var(--live-button, var(--center-live-button));
  --media-seek-backward-button-display: var(--seek-backward-button, var(--center-seek-backward-button));
  --media-seek-forward-button-display: var(--seek-forward-button, var(--center-seek-forward-button));
  --media-mute-button-display: var(--mute-button, var(--center-mute-button));
  --media-captions-button-display: var(--captions-button, var(--center-captions-button));
  --media-captions-menu-button-display: var(
    --captions-menu-button,
    var(--media-captions-button-display, var(--center-captions-menu-button))
  );
  --media-rendition-menu-button-display: var(--rendition-menu-button, var(--center-rendition-menu-button));
  --media-audio-track-menu-button-display: var(--audio-track-menu-button, var(--center-audio-track-menu-button));
  --media-airplay-button-display: var(--airplay-button, var(--center-airplay-button));
  --media-pip-button-display: var(--pip-button, var(--center-pip-button));
  --media-fullscreen-button-display: var(--fullscreen-button, var(--center-fullscreen-button));
  --media-cast-button-display: var(--cast-button, var(--center-cast-button, var(--_cast-button-drm-display)));
  --media-playback-rate-button-display: var(--playback-rate-button, var(--center-playback-rate-button));
  --media-playback-rate-menu-button-display: var(
    --playback-rate-menu-button,
    var(--media-playback-rate-button-display, var(--center-playback-rate-menu-button))
  );
  --media-volume-range-display: var(--volume-range, var(--center-volume-range));
  --media-time-range-display: var(--time-range, var(--center-time-range));
  --media-time-display-display: var(--time-display, var(--center-time-display));
  --media-duration-display-display: var(--duration-display, var(--center-duration-display));
}

::part(bottom),
[part~='bottom'] {
  --media-control-display: var(--controls, var(--bottom-controls));
  --media-play-button-display: var(--play-button, var(--bottom-play-button));
  --media-live-button-display: var(--live-button, var(--bottom-live-button));
  --media-seek-backward-button-display: var(--seek-backward-button, var(--bottom-seek-backward-button));
  --media-seek-forward-button-display: var(--seek-forward-button, var(--bottom-seek-forward-button));
  --media-mute-button-display: var(--mute-button, var(--bottom-mute-button));
  --media-captions-button-display: var(--captions-button, var(--bottom-captions-button));
  --media-captions-menu-button-display: var(
    --captions-menu-button,
    var(--media-captions-button-display, var(--bottom-captions-menu-button))
  );
  --media-rendition-menu-button-display: var(--rendition-menu-button, var(--bottom-rendition-menu-button));
  --media-audio-track-menu-button-display: var(--audio-track-menu-button, var(--bottom-audio-track-menu-button));
  --media-airplay-button-display: var(--airplay-button, var(--bottom-airplay-button));
  --media-pip-button-display: var(--pip-button, var(--bottom-pip-button));
  --media-fullscreen-button-display: var(--fullscreen-button, var(--bottom-fullscreen-button));
  --media-cast-button-display: var(--cast-button, var(--bottom-cast-button, var(--_cast-button-drm-display)));
  --media-playback-rate-button-display: var(--playback-rate-button, var(--bottom-playback-rate-button));
  --media-playback-rate-menu-button-display: var(
    --playback-rate-menu-button,
    var(--media-playback-rate-button-display, var(--bottom-playback-rate-menu-button))
  );
  --media-volume-range-display: var(--volume-range, var(--bottom-volume-range));
  --media-time-range-display: var(--time-range, var(--bottom-time-range));
  --media-time-display-display: var(--time-display, var(--bottom-time-display));
  --media-duration-display-display: var(--duration-display, var(--bottom-duration-display));
  --media-title-display-display: var(--title-display, var(--bottom-title-display));
}

:host([no-tooltips]) {
  --media-tooltip-display: none;
}
`,Nr=new WeakMap,vA=class kf{constructor(e,i){this.element=e,this.type=i,this.element.addEventListener(this.type,this);let a=Nr.get(this.element);a&&a.set(this.type,this)}set(e){if(typeof e=="function")this.handleEvent=e.bind(this.element);else if(typeof e=="object"&&typeof e.handleEvent=="function")this.handleEvent=e.handleEvent.bind(e);else{this.element.removeEventListener(this.type,this);let i=Nr.get(this.element);i&&i.delete(this.type)}}static for(e){Nr.has(e.element)||Nr.set(e.element,new Map);let i=e.attributeName.slice(2),a=Nr.get(e.element);return a&&a.has(i)?a.get(i):new kf(e.element,i)}};function fA(t,e){return t instanceof It&&t.attributeName.startsWith("on")?(vA.for(t).set(e),t.element.removeAttributeNS(t.attributeNamespace,t.attributeName),!0):!1}function EA(t,e){return e instanceof Sf&&t instanceof yr?(e.renderInto(t),!0):!1}function _A(t,e){return e instanceof DocumentFragment&&t instanceof yr?(e.childNodes.length&&t.replace(...e.childNodes),!0):!1}function bA(t,e){if(t instanceof It){let i=t.attributeNamespace,a=t.element.getAttributeNS(i,t.attributeName);return String(e)!==a&&(t.value=String(e)),!0}return t.value=String(e),!0}function gA(t,e){if(t instanceof It&&e instanceof Element){let i=t.element;return i[t.attributeName]!==e&&(t.element.removeAttributeNS(t.attributeNamespace,t.attributeName),i[t.attributeName]=e),!0}return!1}function yA(t,e){if(typeof e=="boolean"&&t instanceof It){let i=t.attributeNamespace,a=t.element.hasAttributeNS(i,t.attributeName);return e!==a&&(t.booleanValue=e),!0}return!1}function TA(t,e){return e===!1&&t instanceof yr?(t.replace(""),!0):!1}function AA(t,e){gA(t,e)||yA(t,e)||fA(t,e)||TA(t,e)||EA(t,e)||_A(t,e)||bA(t,e)}var Bl=new Map,fm=new WeakMap,Em=new WeakMap,Sf=class{constructor(t,e,i){this.strings=t,this.values=e,this.processor=i,this.stringsKey=this.strings.join("")}get template(){if(Bl.has(this.stringsKey))return Bl.get(this.stringsKey);{let t=zo.createElement("template"),e=this.strings.length-1;return t.innerHTML=this.strings.reduce((i,a,r)=>i+a+(r<e?`{{ ${r} }}`:""),""),Bl.set(this.stringsKey,t),t}}renderInto(t){var e;let i=this.template;if(fm.get(t)!==i){fm.set(t,i);let r=new pl(i,this.values,this.processor);Em.set(t,r),t instanceof yr?t.replace(...r.children):t.appendChild(r);return}let a=Em.get(t);(e=a?.update)==null||e.call(a,this.values)}},kA={processCallback(t,e,i){var a;if(i){for(let[r,n]of e)if(r in i){let s=(a=i[r])!=null?a:"";AA(n,s)}}}};function vo(t,...e){return new Sf(t,e,kA)}function SA(t,e){t.renderInto(e)}var wA=t=>{let{tokens:e}=t;return e.drm?":host(:not([cast-receiver])) { --_cast-button-drm-display: none; }":""},IA=t=>vo`
  <style>
    ${wA(t)}
    ${pA}
  </style>
  ${DA(t)}
`,RA=t=>{let e=t.hotKeys?`${t.hotKeys}`:"";return Nc(t.streamType)==="live"&&(e+=" noarrowleft noarrowright"),e},LA={TOP:"top",CENTER:"center",BOTTOM:"bottom",LAYER:"layer",MEDIA_LAYER:"media-layer",POSTER_LAYER:"poster-layer",VERTICAL_LAYER:"vertical-layer",CENTERED_LAYER:"centered-layer",GESTURE_LAYER:"gesture-layer",CONTROLLER_LAYER:"controller",BUTTON:"button",RANGE:"range",THUMB:"thumb",DISPLAY:"display",CONTROL_BAR:"control-bar",MENU_BUTTON:"menu-button",MENU:"menu",MENU_ITEM:"menu-item",OPTION:"option",POSTER:"poster",LIVE:"live",PLAY:"play",PRE_PLAY:"pre-play",SEEK_BACKWARD:"seek-backward",SEEK_FORWARD:"seek-forward",MUTE:"mute",CAPTIONS:"captions",AIRPLAY:"airplay",PIP:"pip",FULLSCREEN:"fullscreen",CAST:"cast",PLAYBACK_RATE:"playback-rate",VOLUME:"volume",TIME:"time",TITLE:"title",AUDIO_TRACK:"audio-track",RENDITION:"rendition"},CA=Object.values(LA).join(", "),DA=t=>{var e,i,a,r,n,s,o,l,u,m,p,h,d,v,E,b,y,T,g,k,D,C,$,B,G,W,U,Ne,ze,Qe,ve,He,Rt,Be,mt,je,we,Pe,We,ei,Vi;return vo`
  <media-theme
    template="${t.themeTemplate||!1}"
    defaultstreamtype="${(e=t.defaultStreamType)!=null?e:!1}"
    hotkeys="${RA(t)||!1}"
    nohotkeys="${t.noHotKeys||!t.hasSrc||!1}"
    noautoseektolive="${!!((i=t.streamType)!=null&&i.includes(j.LIVE))&&t.targetLiveWindow!==0}"
    novolumepref="${t.novolumepref||!1}"
    nomutedpref="${t.nomutedpref||!1}"
    disabled="${!t.hasSrc||t.isDialogOpen}"
    audio="${(a=t.audio)!=null?a:!1}"
    style="${(r=tA({"--media-primary-color":t.primaryColor,"--media-secondary-color":t.secondaryColor,"--media-accent-color":t.accentColor}))!=null?r:!1}"
    defaultsubtitles="${!t.defaultHiddenCaptions}"
    forwardseekoffset="${(n=t.forwardSeekOffset)!=null?n:!1}"
    backwardseekoffset="${(s=t.backwardSeekOffset)!=null?s:!1}"
    playbackrates="${(o=t.playbackRates)!=null?o:!1}"
    defaultshowremainingtime="${(l=t.defaultShowRemainingTime)!=null?l:!1}"
    defaultduration="${(u=t.defaultDuration)!=null?u:!1}"
    hideduration="${(m=t.hideDuration)!=null?m:!1}"
    title="${(p=t.title)!=null?p:!1}"
    videotitle="${(h=t.videoTitle)!=null?h:!1}"
    proudlydisplaymuxbadge="${(d=t.proudlyDisplayMuxBadge)!=null?d:!1}"
    exportparts="${CA}"
    onclose="${t.onCloseErrorDialog}"
    onfocusin="${t.onFocusInErrorDialog}"
  >
    <mux-video
      slot="media"
      inert="${(v=t.noHotKeys)!=null?v:!1}"
      target-live-window="${(E=t.targetLiveWindow)!=null?E:!1}"
      stream-type="${(b=Nc(t.streamType))!=null?b:!1}"
      crossorigin="${(y=t.crossOrigin)!=null?y:""}"
      playsinline
      autoplay="${(T=t.autoplay)!=null?T:!1}"
      muted="${(g=t.muted)!=null?g:!1}"
      loop="${(k=t.loop)!=null?k:!1}"
      preload="${(D=t.preload)!=null?D:!1}"
      debug="${(C=t.debug)!=null?C:!1}"
      prefer-cmcd="${($=t.preferCmcd)!=null?$:!1}"
      disable-tracking="${(B=t.disableTracking)!=null?B:!1}"
      disable-cookies="${(G=t.disableCookies)!=null?G:!1}"
      prefer-playback="${(W=t.preferPlayback)!=null?W:!1}"
      start-time="${t.startTime!=null?t.startTime:!1}"
      initial-bandwidth-estimate-kbps="${t.initialBandwidthEstimateKbps!=null?t.initialBandwidthEstimateKbps:!1}"
      initial-estimate-segments="${t.initialEstimateSegments!=null?t.initialEstimateSegments:!1}"
      min-preload-segments="${t.minPreloadSegments!=null?t.minPreloadSegments:!1}"
      beacon-collection-domain="${(U=t.beaconCollectionDomain)!=null?U:!1}"
      player-init-time="${(Ne=t.playerInitTime)!=null?Ne:!1}"
      player-software-name="${(ze=t.playerSoftwareName)!=null?ze:!1}"
      player-software-version="${(Qe=t.playerSoftwareVersion)!=null?Qe:!1}"
      env-key="${(ve=t.envKey)!=null?ve:!1}"
      custom-domain="${(He=t.customDomain)!=null?He:!1}"
      src="${t.src?t.src:t.playbackId?Jl(t):!1}"
      cast-src="${t.src?t.src:t.playbackId?Jl(t):!1}"
      cast-receiver="${(Rt=t.castReceiver)!=null?Rt:!1}"
      drm-token="${(mt=(Be=t.tokens)==null?void 0:Be.drm)!=null?mt:!1}"
      playback-token="${(we=(je=t.tokens)==null?void 0:je.playback)!=null?we:!1}"
      exportparts="video"
      disable-pseudo-ended="${(Pe=t.disablePseudoEnded)!=null?Pe:!1}"
      max-auto-resolution="${(We=t.maxAutoResolution)!=null?We:!1}"
      cap-rendition-to-player-size="${(ei=t.capRenditionToPlayerSize)!=null?ei:!1}"
    >
      ${t.storyboard?vo`<track label="thumbnails" default kind="metadata" src="${t.storyboard}" />`:vo``}
      <slot></slot>
    </mux-video>
    <slot name="poster" slot="poster">
      <media-poster-image
        part="poster"
        exportparts="poster, img"
        src="${t.poster?t.poster:!1}"
        placeholdersrc="${(Vi=t.placeholder)!=null?Vi:!1}"
      ></media-poster-image>
    </slot>
  </media-theme>
`},wf=t=>t.charAt(0).toUpperCase()+t.slice(1),MA=(t,e=!1)=>{var i,a;if(t.muxCode){let r=wf((i=t.errorCategory)!=null?i:"video"),n=Jo((a=t.errorCategory)!=null?a:Z.VIDEO);if(t.muxCode===x.NETWORK_OFFLINE)return O("Your device appears to be offline",e);if(t.muxCode===x.NETWORK_TOKEN_EXPIRED)return O("{category} URL has expired",e).format({category:r});if([x.NETWORK_TOKEN_SUB_MISMATCH,x.NETWORK_TOKEN_AUD_MISMATCH,x.NETWORK_TOKEN_AUD_MISSING,x.NETWORK_TOKEN_MALFORMED].includes(t.muxCode))return O("{category} URL is formatted incorrectly",e).format({category:r});if(t.muxCode===x.NETWORK_TOKEN_MISSING)return O("Invalid {categoryName} URL",e).format({categoryName:n});if(t.muxCode===x.NETWORK_NOT_FOUND)return O("{category} does not exist",e).format({category:r});if(t.muxCode===x.NETWORK_NOT_READY){let s=t.streamType==="live"?"Live stream":"Video";return O("{mediaType} is not currently available",e).format({mediaType:s})}}if(t.code){if(t.code===I.MEDIA_ERR_NETWORK)return O("Network Error",e);if(t.code===I.MEDIA_ERR_DECODE)return O("Media Error",e);if(t.code===I.MEDIA_ERR_SRC_NOT_SUPPORTED)return O("Source Not Supported",e)}return O("Error",e)},OA=(t,e=!1)=>{var i,a;if(t.muxCode){let r=wf((i=t.errorCategory)!=null?i:"video"),n=Jo((a=t.errorCategory)!=null?a:Z.VIDEO);return t.muxCode===x.NETWORK_OFFLINE?O("Check your internet connection and try reloading this video.",e):t.muxCode===x.NETWORK_TOKEN_EXPIRED?O("The video’s secured {tokenNamePrefix}-token has expired.",e).format({tokenNamePrefix:n}):t.muxCode===x.NETWORK_TOKEN_SUB_MISMATCH?O("The video’s playback ID does not match the one encoded in the {tokenNamePrefix}-token.",e).format({tokenNamePrefix:n}):t.muxCode===x.NETWORK_TOKEN_MALFORMED?O("{category} URL is formatted incorrectly",e).format({category:r}):[x.NETWORK_TOKEN_AUD_MISMATCH,x.NETWORK_TOKEN_AUD_MISSING].includes(t.muxCode)?O("The {tokenNamePrefix}-token is formatted with incorrect information.",e).format({tokenNamePrefix:n}):[x.NETWORK_TOKEN_MISSING,x.NETWORK_INVALID_URL].includes(t.muxCode)?O("The video URL or {tokenNamePrefix}-token are formatted with incorrect or incomplete information.",e).format({tokenNamePrefix:n}):t.muxCode===x.NETWORK_NOT_FOUND?"":t.message}return t.code&&(t.code===I.MEDIA_ERR_NETWORK||t.code===I.MEDIA_ERR_DECODE||(t.code,I.MEDIA_ERR_SRC_NOT_SUPPORTED)),t.message},xA=(t,e=!1)=>{let i=MA(t,e).toString(),a=OA(t,e).toString();return{title:i,message:a}},NA=t=>{if(t.muxCode){if(t.muxCode===x.NETWORK_TOKEN_EXPIRED)return"403-expired-token.md";if(t.muxCode===x.NETWORK_TOKEN_MALFORMED)return"403-malformatted-token.md";if([x.NETWORK_TOKEN_AUD_MISMATCH,x.NETWORK_TOKEN_AUD_MISSING].includes(t.muxCode))return"403-incorrect-aud-value.md";if(t.muxCode===x.NETWORK_TOKEN_SUB_MISMATCH)return"403-playback-id-mismatch.md";if(t.muxCode===x.NETWORK_TOKEN_MISSING)return"missing-signed-tokens.md";if(t.muxCode===x.NETWORK_NOT_FOUND)return"404-not-found.md";if(t.muxCode===x.NETWORK_NOT_READY)return"412-not-playable.md"}if(t.code){if(t.code===I.MEDIA_ERR_NETWORK)return"";if(t.code===I.MEDIA_ERR_DECODE)return"media-decode-error.md";if(t.code===I.MEDIA_ERR_SRC_NOT_SUPPORTED)return"media-src-not-supported.md"}return""},If=(t,e)=>{let i=NA(t);return{message:t.message,context:t.context,file:i}},PA=`<template id="media-theme-gerwig">
  <style>
    @keyframes pre-play-hide {
      0% {
        transform: scale(1);
        opacity: 1;
      }

      30% {
        transform: scale(0.7);
      }

      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    :host {
      --_primary-color: var(--media-primary-color, #fff);
      --_secondary-color: var(--media-secondary-color, transparent);
      --_accent-color: var(--media-accent-color, #fa50b5);
      --_text-color: var(--media-text-color, #000);

      --media-icon-color: var(--_primary-color);
      --media-control-background: var(--_secondary-color);
      --media-control-hover-background: var(--_accent-color);
      --media-time-buffered-color: rgba(255, 255, 255, 0.4);
      --media-preview-time-text-shadow: none;
      --media-control-height: 14px;
      --media-control-padding: 6px;
      --media-tooltip-container-margin: 6px;
      --media-tooltip-distance: 18px;

      color: var(--_primary-color);
      display: inline-block;
      width: 100%;
      height: 100%;
    }

    :host([audio]) {
      --_secondary-color: var(--media-secondary-color, black);
      --media-preview-time-text-shadow: none;
    }

    :host([audio]) ::slotted([slot='media']) {
      height: 0px;
    }

    :host([audio]) media-loading-indicator {
      display: none;
    }

    :host([audio]) media-controller {
      background: transparent;
    }

    :host([audio]) media-controller::part(vertical-layer) {
      background: transparent;
    }

    :host([audio]) media-control-bar {
      width: 100%;
      background-color: var(--media-control-background);
    }

    /*
     * 0.433s is the transition duration for VTT Regions.
     * Borrowed here, so the captions don't move too fast.
     */
    media-controller {
      --media-webkit-text-track-transform: translateY(0) scale(0.98);
      --media-webkit-text-track-transition: transform 0.433s ease-out 0.3s;
    }
    media-controller:is([mediapaused], :not([userinactive])) {
      --media-webkit-text-track-transform: translateY(-50px) scale(0.98);
      --media-webkit-text-track-transition: transform 0.15s ease;
    }

    /*
     * CSS specific to iOS devices.
     * See: https://stackoverflow.com/questions/30102792/css-media-query-to-target-only-ios-devices/60220757#60220757
     */
    @supports (-webkit-touch-callout: none) {
      /* Disable subtitle adjusting for iOS Safari */
      media-controller[mediaisfullscreen] {
        --media-webkit-text-track-transform: unset;
        --media-webkit-text-track-transition: unset;
      }
    }

    media-time-range {
      --media-box-padding-left: 6px;
      --media-box-padding-right: 6px;
      --media-range-bar-color: var(--_accent-color);
      --media-time-range-buffered-color: var(--_primary-color);
      --media-range-track-color: transparent;
      --media-range-track-background: rgba(255, 255, 255, 0.4);
      --media-range-thumb-background: radial-gradient(
        circle,
        #000 0%,
        #000 25%,
        var(--_accent-color) 25%,
        var(--_accent-color)
      );
      --media-range-thumb-width: 12px;
      --media-range-thumb-height: 12px;
      --media-range-thumb-transform: scale(0);
      --media-range-thumb-transition: transform 0.3s;
      --media-range-thumb-opacity: 1;
      --media-preview-background: var(--_primary-color);
      --media-box-arrow-background: var(--_primary-color);
      --media-preview-thumbnail-border: 5px solid var(--_primary-color);
      --media-preview-border-radius: 5px;
      --media-text-color: var(--_text-color);
      --media-control-hover-background: transparent;
      --media-preview-chapter-text-shadow: none;
      color: var(--_accent-color);
      padding: 0 6px;
    }

    :host([audio]) media-time-range {
      --media-preview-time-padding: 1.5px 6px;
      --media-preview-box-margin: 0 0 -5px;
    }

    media-time-range:hover {
      --media-range-thumb-transform: scale(1);
    }

    media-preview-thumbnail {
      border-bottom-width: 0;
    }

    [part~='menu'] {
      border-radius: 2px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      bottom: 50px;
      padding: 2.5px 10px;
    }

    [part~='menu']::part(indicator) {
      fill: var(--_accent-color);
    }

    [part~='menu']::part(menu-item) {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      padding: 6px 10px;
      min-height: 34px;
    }

    [part~='menu']::part(checked) {
      font-weight: 700;
    }

    media-captions-menu,
    media-rendition-menu,
    media-audio-track-menu,
    media-playback-rate-menu {
      position: absolute; /* ensure they don't take up space in DOM on load */
      --media-menu-background: var(--_primary-color);
      --media-menu-item-checked-background: transparent;
      --media-text-color: var(--_text-color);
      --media-menu-item-hover-background: transparent;
      --media-menu-item-hover-outline: var(--_accent-color) solid 1px;
    }

    media-rendition-menu {
      min-width: 140px;
    }

    /* The icon is a circle so make it 16px high instead of 14px for more balance. */
    media-audio-track-menu-button {
      --media-control-padding: 5px;
      --media-control-height: 16px;
    }

    media-playback-rate-menu-button {
      --media-control-padding: 6px 3px;
      min-width: 4.4ch;
    }

    media-playback-rate-menu {
      --media-menu-flex-direction: row;
      --media-menu-item-checked-background: var(--_accent-color);
      --media-menu-item-checked-indicator-display: none;
      margin-right: 6px;
      padding: 0;
      --media-menu-gap: 0.25em;
    }

    media-playback-rate-menu[part~='menu']::part(menu-item) {
      padding: 6px 6px 6px 8px;
    }

    media-playback-rate-menu[part~='menu']::part(checked) {
      color: #fff;
    }

    :host(:not([audio])) media-time-range {
      /* Adding px is required here for calc() */
      --media-range-padding: 0px;
      background: transparent;
      z-index: 10;
      height: 10px;
      bottom: -3px;
      width: 100%;
    }

    media-control-bar :is([role='button'], [role='switch'], button) {
      line-height: 0;
    }

    media-control-bar :is([part*='button'], [part*='range'], [part*='display']) {
      border-radius: 3px;
    }

    .spacer {
      flex-grow: 1;
      background-color: var(--media-control-background, rgba(20, 20, 30, 0.7));
    }

    media-control-bar[slot~='top-chrome'] {
      min-height: 42px;
      pointer-events: none;
    }

    media-control-bar {
      --gradient-steps:
        hsl(0 0% 0% / 0) 0%, hsl(0 0% 0% / 0.013) 8.1%, hsl(0 0% 0% / 0.049) 15.5%, hsl(0 0% 0% / 0.104) 22.5%,
        hsl(0 0% 0% / 0.175) 29%, hsl(0 0% 0% / 0.259) 35.3%, hsl(0 0% 0% / 0.352) 41.2%, hsl(0 0% 0% / 0.45) 47.1%,
        hsl(0 0% 0% / 0.55) 52.9%, hsl(0 0% 0% / 0.648) 58.8%, hsl(0 0% 0% / 0.741) 64.7%, hsl(0 0% 0% / 0.825) 71%,
        hsl(0 0% 0% / 0.896) 77.5%, hsl(0 0% 0% / 0.951) 84.5%, hsl(0 0% 0% / 0.987) 91.9%, hsl(0 0% 0%) 100%;
    }

    :host([title]) media-control-bar[slot='top-chrome']::before,
    :host([videotitle]) media-control-bar[slot='top-chrome']::before {
      content: '';
      position: absolute;
      width: 100%;
      padding-bottom: min(100px, 25%);
      background: linear-gradient(to top, var(--gradient-steps));
      opacity: 0.8;
      pointer-events: none;
    }

    :host(:not([audio])) media-control-bar[part~='bottom']::before {
      content: '';
      position: absolute;
      width: 100%;
      bottom: 0;
      left: 0;
      padding-bottom: min(100px, 25%);
      background: linear-gradient(to bottom, var(--gradient-steps));
      opacity: 0.8;
      z-index: 1;
      pointer-events: none;
    }

    media-control-bar[part~='bottom'] > * {
      z-index: 20;
    }

    media-control-bar[part~='bottom'] {
      padding: 6px 6px;
    }

    media-control-bar[slot~='top-chrome'] > * {
      --media-control-background: transparent;
      --media-control-hover-background: transparent;
      position: relative;
    }

    media-controller::part(vertical-layer) {
      transition: background-color 1s;
    }

    media-controller:is([mediapaused], :not([userinactive]))::part(vertical-layer) {
      background-color: var(--controls-backdrop-color, var(--controls, transparent));
      transition: background-color 0.25s;
    }

    .center-controls {
      --media-button-icon-width: 100%;
      --media-button-icon-height: auto;
      --media-tooltip-display: none;
      pointer-events: none;
      width: 100%;
      display: flex;
      flex-flow: row;
      align-items: center;
      justify-content: center;
      paint-order: stroke;
      stroke: rgba(102, 102, 102, 1);
      stroke-width: 0.3px;
      text-shadow:
        0 0 2px rgb(0 0 0 / 0.25),
        0 0 6px rgb(0 0 0 / 0.25);
    }

    .center-controls media-play-button {
      --media-control-background: transparent;
      --media-control-hover-background: transparent;
      --media-control-padding: 0;
      width: 40px;
      filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.25)) drop-shadow(0 0 6px rgb(0 0 0 / 0.25));
    }

    [breakpointsm] .center-controls media-play-button {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      transition: background 0.4s;
      padding: 24px;
      --media-control-background: #000;
      --media-control-hover-background: var(--_accent-color);
    }

    .center-controls media-seek-backward-button,
    .center-controls media-seek-forward-button {
      --media-control-background: transparent;
      --media-control-hover-background: transparent;
      padding: 0;
      margin: 0 20px;
      width: max(33px, min(8%, 40px));
      text-shadow:
        0 0 2px rgb(0 0 0 / 0.25),
        0 0 6px rgb(0 0 0 / 0.25);
    }

    [breakpointsm]:not([audio]) .center-controls.pre-playback {
      display: grid;
      align-items: initial;
      justify-content: initial;
      height: 100%;
      overflow: hidden;
    }

    [breakpointsm]:not([audio]) .center-controls.pre-playback media-play-button {
      place-self: var(--_pre-playback-place, center);
      grid-area: 1 / 1;
      margin: 16px;
    }

    /* Show and hide controls or pre-playback state */

    [breakpointsm]:is([mediahasplayed], :not([mediapaused])):not([audio])
      .center-controls.pre-playback
      media-play-button {
      /* Using \`forwards\` would lead to a laggy UI after the animation got in the end state */
      animation: 0.3s linear pre-play-hide;
      opacity: 0;
      pointer-events: none;
    }

    .autoplay-unmute {
      --media-control-hover-background: transparent;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.25)) drop-shadow(0 0 6px rgb(0 0 0 / 0.25));
    }

    .autoplay-unmute-btn {
      --media-control-height: 16px;
      border-radius: 8px;
      background: #000;
      color: var(--_primary-color);
      display: flex;
      align-items: center;
      padding: 8px 16px;
      font-size: 18px;
      font-weight: 500;
      cursor: pointer;
    }

    .autoplay-unmute-btn:hover {
      background: var(--_accent-color);
    }

    [breakpointsm] .autoplay-unmute-btn {
      --media-control-height: 30px;
      padding: 14px 24px;
      font-size: 26px;
    }

    .autoplay-unmute-btn svg {
      margin: 0 6px 0 0;
    }

    [breakpointsm] .autoplay-unmute-btn svg {
      margin: 0 10px 0 0;
    }

    media-controller:not([audio]):not([mediahasplayed]) *:is(media-control-bar, media-time-range) {
      display: none;
    }

    media-error-dialog:not([mediaerrorcode]) {
      opacity: 0;
    }

    media-loading-indicator {
      --media-loading-icon-width: 100%;
      --media-button-icon-height: auto;
      display: var(--media-control-display, var(--media-loading-indicator-display, flex));
      pointer-events: none;
      position: absolute;
      width: min(15%, 150px);
      flex-flow: row;
      align-items: center;
      justify-content: center;
    }

    /* Intentionally don't target the div for transition but the children
     of the div. Prevents messing with media-chrome's autohide feature. */
    media-loading-indicator + div * {
      transition: opacity 0.15s;
      opacity: 1;
    }

    media-loading-indicator[medialoading]:not([mediapaused]) ~ div > * {
      opacity: 0;
      transition-delay: 400ms;
    }

    media-volume-range {
      width: min(100%, 100px);
      --media-range-padding-left: 10px;
      --media-range-padding-right: 10px;
      --media-range-thumb-width: 12px;
      --media-range-thumb-height: 12px;
      --media-range-thumb-background: radial-gradient(
        circle,
        #000 0%,
        #000 25%,
        var(--_primary-color) 25%,
        var(--_primary-color)
      );
      --media-control-hover-background: none;
    }

    media-time-display {
      white-space: nowrap;
    }

    /* Generic style for explicitly disabled controls */
    media-control-bar[part~='bottom'] [disabled],
    media-control-bar[part~='bottom'] [aria-disabled='true'] {
      opacity: 60%;
      cursor: not-allowed;
    }

    media-text-display {
      --media-font-size: 16px;
      --media-control-padding: 14px;
      font-weight: 500;
    }

    media-play-button.animated *:is(g, path) {
      transition: all 0.3s;
    }

    media-play-button.animated[mediapaused] .pause-icon-pt1 {
      opacity: 0;
    }

    media-play-button.animated[mediapaused] .pause-icon-pt2 {
      transform-origin: center center;
      transform: scaleY(0);
    }

    media-play-button.animated[mediapaused] .play-icon {
      clip-path: inset(0 0 0 0);
    }

    media-play-button.animated:not([mediapaused]) .play-icon {
      clip-path: inset(0 0 0 100%);
    }

    media-seek-forward-button,
    media-seek-backward-button {
      --media-font-weight: 400;
    }

    .mute-icon {
      display: inline-block;
    }

    .mute-icon :is(path, g) {
      transition: opacity 0.5s;
    }

    .muted {
      opacity: 0;
    }

    media-mute-button[mediavolumelevel='low'] :is(.volume-medium, .volume-high),
    media-mute-button[mediavolumelevel='medium'] :is(.volume-high) {
      opacity: 0;
    }

    media-mute-button[mediavolumelevel='off'] .unmuted {
      opacity: 0;
    }

    media-mute-button[mediavolumelevel='off'] .muted {
      opacity: 1;
    }

    /**
     * Our defaults for these buttons are to hide them at small sizes
     * users can override this with CSS
     */
    media-controller:not([breakpointsm]):not([audio]) {
      --bottom-play-button: none;
      --bottom-seek-backward-button: none;
      --bottom-seek-forward-button: none;
      --bottom-time-display: none;
      --bottom-playback-rate-menu-button: none;
      --bottom-pip-button: none;
    }

    [part='mux-badge'] {
      position: absolute;
      bottom: 10px;
      right: 10px;
      z-index: 2;
      opacity: 0.6;
      transition:
        opacity 0.2s ease-in-out,
        bottom 0.2s ease-in-out;
    }

    [part='mux-badge']:hover {
      opacity: 1;
    }

    [part='mux-badge'] a {
      font-size: 14px;
      font-family: var(--_font-family);
      color: var(--_primary-color);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    [part='mux-badge'] .mux-badge-text {
      transition: opacity 0.5s ease-in-out;
      opacity: 0;
    }

    [part='mux-badge'] .mux-badge-logo {
      width: 40px;
      height: auto;
      display: inline-block;
    }

    [part='mux-badge'] .mux-badge-logo svg {
      width: 100%;
      height: 100%;
      fill: white;
    }

    media-controller:not([userinactive]):not([mediahasplayed]) [part='mux-badge'],
    media-controller:not([userinactive]) [part='mux-badge'],
    media-controller[mediahasplayed][mediapaused] [part='mux-badge'] {
      transition: bottom 0.1s ease-in-out;
    }

    media-controller[userinactive]:not([mediapaused]) [part='mux-badge'] {
      transition: bottom 0.2s ease-in-out 0.62s;
    }

    media-controller:not([userinactive]) [part='mux-badge'] .mux-badge-text,
    media-controller[mediahasplayed][mediapaused] [part='mux-badge'] .mux-badge-text {
      opacity: 1;
    }

    media-controller[userinactive]:not([mediapaused]) [part='mux-badge'] .mux-badge-text {
      opacity: 0;
    }

    media-controller[userinactive]:not([mediapaused]) [part='mux-badge'] {
      bottom: 10px;
    }

    media-controller:not([userinactive]):not([mediahasplayed]) [part='mux-badge'] {
      bottom: 10px;
    }

    media-controller:not([userinactive])[mediahasplayed] [part='mux-badge'],
    media-controller[mediahasplayed][mediapaused] [part='mux-badge'] {
      bottom: calc(28px + var(--media-control-height, 0px) + var(--media-control-padding, 0px) * 2);
    }
  </style>

  <template partial="TitleDisplay">
    <template if="videotitle">
      <template if="videotitle != true">
        <media-text-display part="top title display" class="title-display">{{videotitle}}</media-text-display>
      </template>
    </template>
    <template if="!videotitle">
      <template if="title">
        <media-text-display part="top title display" class="title-display">{{title}}</media-text-display>
      </template>
    </template>
  </template>

  <template partial="PlayButton">
    <media-play-button
      part="{{section ?? 'bottom'}} play button"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
      class="animated"
    >
      <svg aria-hidden="true" viewBox="0 0 18 14" slot="icon">
        <g class="play-icon">
          <path
            d="M15.5987 6.2911L3.45577 0.110898C2.83667 -0.204202 2.06287 0.189698 2.06287 0.819798V13.1802C2.06287 13.8103 2.83667 14.2042 3.45577 13.8891L15.5987 7.7089C16.2178 7.3938 16.2178 6.6061 15.5987 6.2911Z"
          />
        </g>
        <g class="pause-icon">
          <path
            class="pause-icon-pt1"
            d="M5.90709 0H2.96889C2.46857 0 2.06299 0.405585 2.06299 0.9059V13.0941C2.06299 13.5944 2.46857 14 2.96889 14H5.90709C6.4074 14 6.81299 13.5944 6.81299 13.0941V0.9059C6.81299 0.405585 6.4074 0 5.90709 0Z"
          />
          <path
            class="pause-icon-pt2"
            d="M15.1571 0H12.2189C11.7186 0 11.313 0.405585 11.313 0.9059V13.0941C11.313 13.5944 11.7186 14 12.2189 14H15.1571C15.6574 14 16.063 13.5944 16.063 13.0941V0.9059C16.063 0.405585 15.6574 0 15.1571 0Z"
          />
        </g>
      </svg>
    </media-play-button>
  </template>

  <template partial="PrePlayButton">
    <media-play-button
      part="{{section ?? 'center'}} play button pre-play"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    >
      <svg aria-hidden="true" viewBox="0 0 18 14" slot="icon" style="transform: translate(3px, 0)">
        <path
          d="M15.5987 6.2911L3.45577 0.110898C2.83667 -0.204202 2.06287 0.189698 2.06287 0.819798V13.1802C2.06287 13.8103 2.83667 14.2042 3.45577 13.8891L15.5987 7.7089C16.2178 7.3938 16.2178 6.6061 15.5987 6.2911Z"
        />
      </svg>
    </media-play-button>
  </template>

  <template partial="SeekBackwardButton">
    <media-seek-backward-button
      seekoffset="{{backwardseekoffset}}"
      part="{{section ?? 'bottom'}} seek-backward button"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    >
      <svg viewBox="0 0 22 14" aria-hidden="true" slot="icon">
        <path
          d="M3.65 2.07888L0.0864 6.7279C-0.0288 6.87812 -0.0288 7.12188 0.0864 7.2721L3.65 11.9211C3.7792 12.0896 4 11.9703 4 11.7321V2.26787C4 2.02968 3.7792 1.9104 3.65 2.07888Z"
        />
        <text transform="translate(6 12)" style="font-size: 14px; font-family: 'ArialMT', 'Arial'">
          {{backwardseekoffset}}
        </text>
      </svg>
    </media-seek-backward-button>
  </template>

  <template partial="SeekForwardButton">
    <media-seek-forward-button
      seekoffset="{{forwardseekoffset}}"
      part="{{section ?? 'bottom'}} seek-forward button"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    >
      <svg viewBox="0 0 22 14" aria-hidden="true" slot="icon">
        <g>
          <text transform="translate(-1 12)" style="font-size: 14px; font-family: 'ArialMT', 'Arial'">
            {{forwardseekoffset}}
          </text>
          <path
            d="M18.35 11.9211L21.9136 7.2721C22.0288 7.12188 22.0288 6.87812 21.9136 6.7279L18.35 2.07888C18.2208 1.91041 18 2.02968 18 2.26787V11.7321C18 11.9703 18.2208 12.0896 18.35 11.9211Z"
          />
        </g>
      </svg>
    </media-seek-forward-button>
  </template>

  <template partial="MuteButton">
    <media-mute-button part="bottom mute button" disabled="{{disabled}}" aria-disabled="{{disabled}}">
      <svg viewBox="0 0 18 14" slot="icon" class="mute-icon" aria-hidden="true">
        <g class="unmuted">
          <path
            d="M6.76786 1.21233L3.98606 3.98924H1.19937C0.593146 3.98924 0.101743 4.51375 0.101743 5.1607V6.96412L0 6.99998L0.101743 7.03583V8.83926C0.101743 9.48633 0.593146 10.0108 1.19937 10.0108H3.98606L6.76773 12.7877C7.23561 13.2547 8 12.9007 8 12.2171V1.78301C8 1.09925 7.23574 0.745258 6.76786 1.21233Z"
          />
          <path
            class="volume-low"
            d="M10 3.54781C10.7452 4.55141 11.1393 5.74511 11.1393 6.99991C11.1393 8.25471 10.7453 9.44791 10 10.4515L10.7988 11.0496C11.6734 9.87201 12.1356 8.47161 12.1356 6.99991C12.1356 5.52821 11.6735 4.12731 10.7988 2.94971L10 3.54781Z"
          />
          <path
            class="volume-medium"
            d="M12.3778 2.40086C13.2709 3.76756 13.7428 5.35806 13.7428 7.00026C13.7428 8.64246 13.2709 10.233 12.3778 11.5992L13.2106 12.1484C14.2107 10.6185 14.739 8.83796 14.739 7.00016C14.739 5.16236 14.2107 3.38236 13.2106 1.85156L12.3778 2.40086Z"
          />
          <path
            class="volume-high"
            d="M15.5981 0.75L14.7478 1.2719C15.7937 2.9919 16.3468 4.9723 16.3468 7C16.3468 9.0277 15.7937 11.0082 14.7478 12.7281L15.5981 13.25C16.7398 11.3722 17.343 9.211 17.343 7C17.343 4.789 16.7398 2.6268 15.5981 0.75Z"
          />
        </g>
        <g class="muted">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M4.39976 4.98924H1.19937C1.19429 4.98924 1.17777 4.98961 1.15296 5.01609C1.1271 5.04369 1.10174 5.09245 1.10174 5.1607V8.83926C1.10174 8.90761 1.12714 8.95641 1.15299 8.984C1.17779 9.01047 1.1943 9.01084 1.19937 9.01084H4.39977L7 11.6066V2.39357L4.39976 4.98924ZM7.47434 1.92006C7.4743 1.9201 7.47439 1.92002 7.47434 1.92006V1.92006ZM6.76773 12.7877L3.98606 10.0108H1.19937C0.593146 10.0108 0.101743 9.48633 0.101743 8.83926V7.03583L0 6.99998L0.101743 6.96412V5.1607C0.101743 4.51375 0.593146 3.98924 1.19937 3.98924H3.98606L6.76786 1.21233C7.23574 0.745258 8 1.09925 8 1.78301V12.2171C8 12.9007 7.23561 13.2547 6.76773 12.7877Z"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M15.2677 9.30323C15.463 9.49849 15.7796 9.49849 15.9749 9.30323C16.1701 9.10796 16.1701 8.79138 15.9749 8.59612L14.2071 6.82841L15.9749 5.06066C16.1702 4.8654 16.1702 4.54882 15.9749 4.35355C15.7796 4.15829 15.4631 4.15829 15.2678 4.35355L13.5 6.1213L11.7322 4.35348C11.537 4.15822 11.2204 4.15822 11.0251 4.35348C10.8298 4.54874 10.8298 4.86532 11.0251 5.06058L12.7929 6.82841L11.0251 8.59619C10.8299 8.79146 10.8299 9.10804 11.0251 9.3033C11.2204 9.49856 11.537 9.49856 11.7323 9.3033L13.5 7.53552L15.2677 9.30323Z"
          />
        </g>
      </svg>
    </media-mute-button>
  </template>

  <template partial="PipButton">
    <media-pip-button part="bottom pip button" disabled="{{disabled}}" aria-disabled="{{disabled}}">
      <svg viewBox="0 0 18 14" aria-hidden="true" slot="icon">
        <path
          d="M15.9891 0H2.011C0.9004 0 0 0.9003 0 2.0109V11.989C0 13.0996 0.9004 14 2.011 14H15.9891C17.0997 14 18 13.0997 18 11.9891V2.0109C18 0.9003 17.0997 0 15.9891 0ZM17 11.9891C17 12.5465 16.5465 13 15.9891 13H2.011C1.4536 13 1.0001 12.5465 1.0001 11.9891V2.0109C1.0001 1.4535 1.4536 0.9999 2.011 0.9999H15.9891C16.5465 0.9999 17 1.4535 17 2.0109V11.9891Z"
        />
        <path
          d="M15.356 5.67822H8.19523C8.03253 5.67822 7.90063 5.81012 7.90063 5.97282V11.3836C7.90063 11.5463 8.03253 11.6782 8.19523 11.6782H15.356C15.5187 11.6782 15.6506 11.5463 15.6506 11.3836V5.97282C15.6506 5.81012 15.5187 5.67822 15.356 5.67822Z"
        />
      </svg>
    </media-pip-button>
  </template>

  <template partial="CaptionsMenu">
    <media-captions-menu-button part="bottom captions button">
      <svg aria-hidden="true" viewBox="0 0 18 14" slot="on">
        <path
          d="M15.989 0H2.011C0.9004 0 0 0.9003 0 2.0109V11.9891C0 13.0997 0.9004 14 2.011 14H15.989C17.0997 14 18 13.0997 18 11.9891V2.0109C18 0.9003 17.0997 0 15.989 0ZM4.2292 8.7639C4.5954 9.1902 5.0935 9.4031 5.7233 9.4031C6.1852 9.4031 6.5544 9.301 6.8302 9.0969C7.1061 8.8933 7.2863 8.614 7.3702 8.26H8.4322C8.3062 8.884 8.0093 9.3733 7.5411 9.7273C7.0733 10.0813 6.4703 10.2581 5.732 10.2581C5.108 10.2581 4.5699 10.1219 4.1168 9.8489C3.6637 9.5759 3.3141 9.1946 3.0685 8.7058C2.8224 8.2165 2.6994 7.6511 2.6994 7.009C2.6994 6.3611 2.8224 5.7927 3.0685 5.3034C3.3141 4.8146 3.6637 4.4323 4.1168 4.1559C4.5699 3.88 5.108 3.7418 5.732 3.7418C6.4703 3.7418 7.0733 3.922 7.5411 4.2818C8.0094 4.6422 8.3062 5.1461 8.4322 5.794H7.3702C7.2862 5.4283 7.106 5.1368 6.8302 4.921C6.5544 4.7052 6.1852 4.5968 5.7233 4.5968C5.0934 4.5968 4.5954 4.8116 4.2292 5.2404C3.8635 5.6696 3.6804 6.259 3.6804 7.009C3.6804 7.7531 3.8635 8.3381 4.2292 8.7639ZM11.0974 8.7639C11.4636 9.1902 11.9617 9.4031 12.5915 9.4031C13.0534 9.4031 13.4226 9.301 13.6984 9.0969C13.9743 8.8933 14.1545 8.614 14.2384 8.26H15.3004C15.1744 8.884 14.8775 9.3733 14.4093 9.7273C13.9415 10.0813 13.3385 10.2581 12.6002 10.2581C11.9762 10.2581 11.4381 10.1219 10.985 9.8489C10.5319 9.5759 10.1823 9.1946 9.9367 8.7058C9.6906 8.2165 9.5676 7.6511 9.5676 7.009C9.5676 6.3611 9.6906 5.7927 9.9367 5.3034C10.1823 4.8146 10.5319 4.4323 10.985 4.1559C11.4381 3.88 11.9762 3.7418 12.6002 3.7418C13.3385 3.7418 13.9415 3.922 14.4093 4.2818C14.8776 4.6422 15.1744 5.1461 15.3004 5.794H14.2384C14.1544 5.4283 13.9742 5.1368 13.6984 4.921C13.4226 4.7052 13.0534 4.5968 12.5915 4.5968C11.9616 4.5968 11.4636 4.8116 11.0974 5.2404C10.7317 5.6696 10.5486 6.259 10.5486 7.009C10.5486 7.7531 10.7317 8.3381 11.0974 8.7639Z"
        />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 18 14" slot="off">
        <path
          d="M5.73219 10.258C5.10819 10.258 4.57009 10.1218 4.11699 9.8488C3.66389 9.5758 3.31429 9.1945 3.06869 8.7057C2.82259 8.2164 2.69958 7.651 2.69958 7.0089C2.69958 6.361 2.82259 5.7926 3.06869 5.3033C3.31429 4.8145 3.66389 4.4322 4.11699 4.1558C4.57009 3.8799 5.10819 3.7417 5.73219 3.7417C6.47049 3.7417 7.07348 3.9219 7.54128 4.2817C8.00958 4.6421 8.30638 5.146 8.43238 5.7939H7.37039C7.28639 5.4282 7.10618 5.1367 6.83039 4.9209C6.55459 4.7051 6.18538 4.5967 5.72348 4.5967C5.09358 4.5967 4.59559 4.8115 4.22939 5.2403C3.86369 5.6695 3.68058 6.2589 3.68058 7.0089C3.68058 7.753 3.86369 8.338 4.22939 8.7638C4.59559 9.1901 5.09368 9.403 5.72348 9.403C6.18538 9.403 6.55459 9.3009 6.83039 9.0968C7.10629 8.8932 7.28649 8.6139 7.37039 8.2599H8.43238C8.30638 8.8839 8.00948 9.3732 7.54128 9.7272C7.07348 10.0812 6.47049 10.258 5.73219 10.258Z"
        />
        <path
          d="M12.6003 10.258C11.9763 10.258 11.4382 10.1218 10.9851 9.8488C10.532 9.5758 10.1824 9.1945 9.93685 8.7057C9.69075 8.2164 9.56775 7.651 9.56775 7.0089C9.56775 6.361 9.69075 5.7926 9.93685 5.3033C10.1824 4.8145 10.532 4.4322 10.9851 4.1558C11.4382 3.8799 11.9763 3.7417 12.6003 3.7417C13.3386 3.7417 13.9416 3.9219 14.4094 4.2817C14.8777 4.6421 15.1745 5.146 15.3005 5.7939H14.2385C14.1545 5.4282 13.9743 5.1367 13.6985 4.9209C13.4227 4.7051 13.0535 4.5967 12.5916 4.5967C11.9617 4.5967 11.4637 4.8115 11.0975 5.2403C10.7318 5.6695 10.5487 6.2589 10.5487 7.0089C10.5487 7.753 10.7318 8.338 11.0975 8.7638C11.4637 9.1901 11.9618 9.403 12.5916 9.403C13.0535 9.403 13.4227 9.3009 13.6985 9.0968C13.9744 8.8932 14.1546 8.6139 14.2385 8.2599H15.3005C15.1745 8.8839 14.8776 9.3732 14.4094 9.7272C13.9416 10.0812 13.3386 10.258 12.6003 10.258Z"
        />
        <path
          d="M15.9891 1C16.5465 1 17 1.4535 17 2.011V11.9891C17 12.5465 16.5465 13 15.9891 13H2.0109C1.4535 13 1 12.5465 1 11.9891V2.0109C1 1.4535 1.4535 0.9999 2.0109 0.9999L15.9891 1ZM15.9891 0H2.0109C0.9003 0 0 0.9003 0 2.0109V11.9891C0 13.0997 0.9003 14 2.0109 14H15.9891C17.0997 14 18 13.0997 18 11.9891V2.0109C18 0.9003 17.0997 0 15.9891 0Z"
        />
      </svg>
    </media-captions-menu-button>
    <media-captions-menu
      hidden
      anchor="auto"
      part="bottom captions menu"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
      exportparts="menu-item"
    >
      <div slot="checked-indicator">
        <style>
          .indicator {
            position: relative;
            top: 1px;
            width: 0.9em;
            height: auto;
            fill: var(--_accent-color);
            margin-right: 5px;
          }

          [aria-checked='false'] .indicator {
            display: none;
          }
        </style>
        <svg viewBox="0 0 14 18" class="indicator">
          <path
            d="M12.252 3.48c-.115.033-.301.161-.425.291-.059.063-1.407 1.815-2.995 3.894s-2.897 3.79-2.908 3.802c-.013.014-.661-.616-1.672-1.624-.908-.905-1.702-1.681-1.765-1.723-.401-.27-.783-.211-1.176.183a1.285 1.285 0 0 0-.261.342.582.582 0 0 0-.082.35c0 .165.01.205.08.35.075.153.213.296 2.182 2.271 1.156 1.159 2.17 2.159 2.253 2.222.189.143.338.196.539.194.203-.003.412-.104.618-.299.205-.193 6.7-8.693 6.804-8.903a.716.716 0 0 0 .085-.345c.01-.179.005-.203-.062-.339-.124-.252-.45-.531-.746-.639a.784.784 0 0 0-.469-.027"
            fill-rule="evenodd"
          />
        </svg></div
    ></media-captions-menu>
  </template>

  <template partial="AirplayButton">
    <media-airplay-button part="bottom airplay button" disabled="{{disabled}}" aria-disabled="{{disabled}}">
      <svg viewBox="0 0 18 14" aria-hidden="true" slot="icon">
        <path
          d="M16.1383 0H1.8618C0.8335 0 0 0.8335 0 1.8617V10.1382C0 11.1664 0.8335 12 1.8618 12H3.076C3.1204 11.9433 3.1503 11.8785 3.2012 11.826L4.004 11H1.8618C1.3866 11 1 10.6134 1 10.1382V1.8617C1 1.3865 1.3866 0.9999 1.8618 0.9999H16.1383C16.6135 0.9999 17.0001 1.3865 17.0001 1.8617V10.1382C17.0001 10.6134 16.6135 11 16.1383 11H13.9961L14.7989 11.826C14.8499 11.8785 14.8798 11.9432 14.9241 12H16.1383C17.1665 12 18.0001 11.1664 18.0001 10.1382V1.8617C18 0.8335 17.1665 0 16.1383 0Z"
        />
        <path
          d="M9.55061 8.21903C9.39981 8.06383 9.20001 7.98633 9.00011 7.98633C8.80021 7.98633 8.60031 8.06383 8.44951 8.21903L4.09771 12.697C3.62471 13.1838 3.96961 13.9998 4.64831 13.9998H13.3518C14.0304 13.9998 14.3754 13.1838 13.9023 12.697L9.55061 8.21903Z"
        />
      </svg>
    </media-airplay-button>
  </template>

  <template partial="FullscreenButton">
    <media-fullscreen-button part="bottom fullscreen button" disabled="{{disabled}}" aria-disabled="{{disabled}}">
      <svg viewBox="0 0 18 14" aria-hidden="true" slot="enter">
        <path
          d="M1.00745 4.39539L1.01445 1.98789C1.01605 1.43049 1.47085 0.978289 2.02835 0.979989L6.39375 0.992589L6.39665 -0.007411L2.03125 -0.020011C0.920646 -0.023211 0.0176463 0.874489 0.0144463 1.98509L0.00744629 4.39539H1.00745Z"
        />
        <path
          d="M17.0144 2.03431L17.0076 4.39541H18.0076L18.0144 2.03721C18.0176 0.926712 17.1199 0.0237125 16.0093 0.0205125L11.6439 0.0078125L11.641 1.00781L16.0064 1.02041C16.5638 1.02201 17.016 1.47681 17.0144 2.03431Z"
        />
        <path
          d="M16.9925 9.60498L16.9855 12.0124C16.9839 12.5698 16.5291 13.022 15.9717 13.0204L11.6063 13.0078L11.6034 14.0078L15.9688 14.0204C17.0794 14.0236 17.9823 13.1259 17.9855 12.0153L17.9925 9.60498H16.9925Z"
        />
        <path
          d="M0.985626 11.9661L0.992426 9.60498H-0.0074737L-0.0142737 11.9632C-0.0174737 13.0738 0.880226 13.9767 1.99083 13.98L6.35623 13.9926L6.35913 12.9926L1.99373 12.98C1.43633 12.9784 0.983926 12.5236 0.985626 11.9661Z"
        />
      </svg>
      <svg viewBox="0 0 18 14" aria-hidden="true" slot="exit">
        <path
          d="M5.39655 -0.0200195L5.38955 2.38748C5.38795 2.94488 4.93315 3.39708 4.37565 3.39538L0.0103463 3.38278L0.00744629 4.38278L4.37285 4.39538C5.48345 4.39858 6.38635 3.50088 6.38965 2.39028L6.39665 -0.0200195H5.39655Z"
        />
        <path
          d="M12.6411 2.36891L12.6479 0.0078125H11.6479L11.6411 2.36601C11.6379 3.47651 12.5356 4.37951 13.6462 4.38271L18.0116 4.39531L18.0145 3.39531L13.6491 3.38271C13.0917 3.38111 12.6395 2.92641 12.6411 2.36891Z"
        />
        <path
          d="M12.6034 14.0204L12.6104 11.613C12.612 11.0556 13.0668 10.6034 13.6242 10.605L17.9896 10.6176L17.9925 9.61759L13.6271 9.60499C12.5165 9.60179 11.6136 10.4995 11.6104 11.6101L11.6034 14.0204H12.6034Z"
        />
        <path
          d="M5.359 11.6315L5.3522 13.9926H6.3522L6.359 11.6344C6.3622 10.5238 5.4645 9.62088 4.3539 9.61758L-0.0115043 9.60498L-0.0144043 10.605L4.351 10.6176C4.9084 10.6192 5.3607 11.074 5.359 11.6315Z"
        />
      </svg>
    </media-fullscreen-button>
  </template>

  <template partial="CastButton">
    <media-cast-button part="bottom cast button" disabled="{{disabled}}" aria-disabled="{{disabled}}">
      <svg viewBox="0 0 18 14" aria-hidden="true" slot="enter">
        <path
          d="M16.0072 0H2.0291C0.9185 0 0.0181 0.9003 0.0181 2.011V5.5009C0.357 5.5016 0.6895 5.5275 1.0181 5.5669V2.011C1.0181 1.4536 1.4716 1 2.029 1H16.0072C16.5646 1 17.0181 1.4536 17.0181 2.011V11.9891C17.0181 12.5465 16.5646 13 16.0072 13H8.4358C8.4746 13.3286 8.4999 13.6611 8.4999 13.9999H16.0071C17.1177 13.9999 18.018 13.0996 18.018 11.989V2.011C18.0181 0.9003 17.1178 0 16.0072 0ZM0 6.4999V7.4999C3.584 7.4999 6.5 10.4159 6.5 13.9999H7.5C7.5 9.8642 4.1357 6.4999 0 6.4999ZM0 8.7499V9.7499C2.3433 9.7499 4.25 11.6566 4.25 13.9999H5.25C5.25 11.1049 2.895 8.7499 0 8.7499ZM0.0181 11V14H3.0181C3.0181 12.3431 1.675 11 0.0181 11Z"
        />
      </svg>
      <svg viewBox="0 0 18 14" aria-hidden="true" slot="exit">
        <path
          d="M15.9891 0H2.01103C0.900434 0 3.35947e-05 0.9003 3.35947e-05 2.011V5.5009C0.338934 5.5016 0.671434 5.5275 1.00003 5.5669V2.011C1.00003 1.4536 1.45353 1 2.01093 1H15.9891C16.5465 1 17 1.4536 17 2.011V11.9891C17 12.5465 16.5465 13 15.9891 13H8.41773C8.45653 13.3286 8.48183 13.6611 8.48183 13.9999H15.989C17.0996 13.9999 17.9999 13.0996 17.9999 11.989V2.011C18 0.9003 17.0997 0 15.9891 0ZM-0.0180664 6.4999V7.4999C3.56593 7.4999 6.48193 10.4159 6.48193 13.9999H7.48193C7.48193 9.8642 4.11763 6.4999 -0.0180664 6.4999ZM-0.0180664 8.7499V9.7499C2.32523 9.7499 4.23193 11.6566 4.23193 13.9999H5.23193C5.23193 11.1049 2.87693 8.7499 -0.0180664 8.7499ZM3.35947e-05 11V14H3.00003C3.00003 12.3431 1.65693 11 3.35947e-05 11Z"
        />
        <path d="M2.15002 5.634C5.18352 6.4207 7.57252 8.8151 8.35282 11.8499H15.8501V2.1499H2.15002V5.634Z" />
      </svg>
    </media-cast-button>
  </template>

  <template partial="LiveButton">
    <media-live-button part="{{section ?? 'top'}} live button" disabled="{{disabled}}" aria-disabled="{{disabled}}">
      <span slot="text">Live</span>
    </media-live-button>
  </template>

  <template partial="PlaybackRateMenu">
    <media-playback-rate-menu-button part="bottom playback-rate button"></media-playback-rate-menu-button>
    <media-playback-rate-menu
      hidden
      anchor="auto"
      rates="{{playbackrates}}"
      exportparts="menu-item"
      part="bottom playback-rate menu"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    ></media-playback-rate-menu>
  </template>

  <template partial="VolumeRange">
    <media-volume-range
      part="bottom volume range"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    ></media-volume-range>
  </template>

  <template partial="TimeDisplay">
    <media-time-display
      remaining="{{defaultshowremainingtime}}"
      showduration="{{!hideduration}}"
      part="bottom time display"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    ></media-time-display>
  </template>

  <template partial="TimeRange">
    <media-time-range part="bottom time range" disabled="{{disabled}}" aria-disabled="{{disabled}}" exportparts="thumb">
      <media-preview-thumbnail slot="preview"></media-preview-thumbnail>
      <media-preview-chapter-display slot="preview"></media-preview-chapter-display>
      <media-preview-time-display slot="preview"></media-preview-time-display>
      <div slot="preview" part="arrow"></div>
    </media-time-range>
  </template>

  <template partial="AudioTrackMenu">
    <media-audio-track-menu-button part="bottom audio-track button">
      <svg aria-hidden="true" slot="icon" viewBox="0 0 18 16">
        <path d="M9 15A7 7 0 1 1 9 1a7 7 0 0 1 0 14Zm0 1A8 8 0 1 0 9 0a8 8 0 0 0 0 16Z" />
        <path
          d="M5.2 6.3a.5.5 0 0 1 .5.5v2.4a.5.5 0 1 1-1 0V6.8a.5.5 0 0 1 .5-.5Zm2.4-2.4a.5.5 0 0 1 .5.5v7.2a.5.5 0 0 1-1 0V4.4a.5.5 0 0 1 .5-.5ZM10 5.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.4-.8a.5.5 0 0 1 .5.5v5.6a.5.5 0 0 1-1 0V5.2a.5.5 0 0 1 .5-.5Z"
        />
      </svg>
    </media-audio-track-menu-button>
    <media-audio-track-menu
      hidden
      anchor="auto"
      part="bottom audio-track menu"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
      exportparts="menu-item"
    >
      <div slot="checked-indicator">
        <style>
          .indicator {
            position: relative;
            top: 1px;
            width: 0.9em;
            height: auto;
            fill: var(--_accent-color);
            margin-right: 5px;
          }

          [aria-checked='false'] .indicator {
            display: none;
          }
        </style>
        <svg viewBox="0 0 14 18" class="indicator">
          <path
            d="M12.252 3.48c-.115.033-.301.161-.425.291-.059.063-1.407 1.815-2.995 3.894s-2.897 3.79-2.908 3.802c-.013.014-.661-.616-1.672-1.624-.908-.905-1.702-1.681-1.765-1.723-.401-.27-.783-.211-1.176.183a1.285 1.285 0 0 0-.261.342.582.582 0 0 0-.082.35c0 .165.01.205.08.35.075.153.213.296 2.182 2.271 1.156 1.159 2.17 2.159 2.253 2.222.189.143.338.196.539.194.203-.003.412-.104.618-.299.205-.193 6.7-8.693 6.804-8.903a.716.716 0 0 0 .085-.345c.01-.179.005-.203-.062-.339-.124-.252-.45-.531-.746-.639a.784.784 0 0 0-.469-.027"
            fill-rule="evenodd"
          />
        </svg>
      </div>
    </media-audio-track-menu>
  </template>

  <template partial="RenditionMenu">
    <media-rendition-menu-button part="bottom rendition button">
      <svg aria-hidden="true" slot="icon" viewBox="0 0 18 14">
        <path
          d="M2.25 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6.75 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        />
      </svg>
    </media-rendition-menu-button>
    <media-rendition-menu
      hidden
      anchor="auto"
      part="bottom rendition menu"
      disabled="{{disabled}}"
      aria-disabled="{{disabled}}"
    >
      <div slot="checked-indicator">
        <style>
          .indicator {
            position: relative;
            top: 1px;
            width: 0.9em;
            height: auto;
            fill: var(--_accent-color);
            margin-right: 5px;
          }

          [aria-checked='false'] .indicator {
            opacity: 0;
          }
        </style>
        <svg viewBox="0 0 14 18" class="indicator">
          <path
            d="M12.252 3.48c-.115.033-.301.161-.425.291-.059.063-1.407 1.815-2.995 3.894s-2.897 3.79-2.908 3.802c-.013.014-.661-.616-1.672-1.624-.908-.905-1.702-1.681-1.765-1.723-.401-.27-.783-.211-1.176.183a1.285 1.285 0 0 0-.261.342.582.582 0 0 0-.082.35c0 .165.01.205.08.35.075.153.213.296 2.182 2.271 1.156 1.159 2.17 2.159 2.253 2.222.189.143.338.196.539.194.203-.003.412-.104.618-.299.205-.193 6.7-8.693 6.804-8.903a.716.716 0 0 0 .085-.345c.01-.179.005-.203-.062-.339-.124-.252-.45-.531-.746-.639a.784.784 0 0 0-.469-.027"
            fill-rule="evenodd"
          />
        </svg>
      </div>
    </media-rendition-menu>
  </template>

  <template partial="MuxBadge">
    <div part="mux-badge">
      <a href="https://www.mux.com/player" target="_blank">
        <span class="mux-badge-text">Powered by</span>
        <div class="mux-badge-logo">
          <svg
            viewBox="0 0 1600 500"
            style="fill-rule: evenodd; clip-rule: evenodd; stroke-linejoin: round; stroke-miterlimit: 2"
          >
            <g>
              <path
                d="M994.287,93.486c-17.121,-0 -31,-13.879 -31,-31c0,-17.121 13.879,-31 31,-31c17.121,-0 31,13.879 31,31c0,17.121 -13.879,31 -31,31m0,-93.486c-34.509,-0 -62.484,27.976 -62.484,62.486l0,187.511c0,68.943 -56.09,125.033 -125.032,125.033c-68.942,-0 -125.03,-56.09 -125.03,-125.033l0,-187.511c0,-34.51 -27.976,-62.486 -62.485,-62.486c-34.509,-0 -62.484,27.976 -62.484,62.486l0,187.511c0,137.853 112.149,250.003 249.999,250.003c137.851,-0 250.001,-112.15 250.001,-250.003l0,-187.511c0,-34.51 -27.976,-62.486 -62.485,-62.486"
                style="fill-rule: nonzero"
              ></path>
              <path
                d="M1537.51,468.511c-17.121,-0 -31,-13.879 -31,-31c0,-17.121 13.879,-31 31,-31c17.121,-0 31,13.879 31,31c0,17.121 -13.879,31 -31,31m-275.883,-218.509l-143.33,143.329c-24.402,24.402 -24.402,63.966 0,88.368c24.402,24.402 63.967,24.402 88.369,-0l143.33,-143.329l143.328,143.329c24.402,24.4 63.967,24.402 88.369,-0c24.403,-24.402 24.403,-63.966 0.001,-88.368l-143.33,-143.329l0.001,-0.004l143.329,-143.329c24.402,-24.402 24.402,-63.965 0,-88.367c-24.402,-24.402 -63.967,-24.402 -88.369,-0l-143.329,143.328l-143.329,-143.328c-24.402,-24.401 -63.967,-24.402 -88.369,-0c-24.402,24.402 -24.402,63.965 0,88.367l143.329,143.329l0,0.004Z"
                style="fill-rule: nonzero"
              ></path>
              <path
                d="M437.511,468.521c-17.121,-0 -31,-13.879 -31,-31c0,-17.121 13.879,-31 31,-31c17.121,-0 31,13.879 31,31c0,17.121 -13.879,31 -31,31m23.915,-463.762c-23.348,-9.672 -50.226,-4.327 -68.096,13.544l-143.331,143.329l-143.33,-143.329c-17.871,-17.871 -44.747,-23.216 -68.096,-13.544c-23.349,9.671 -38.574,32.455 -38.574,57.729l0,375.026c0,34.51 27.977,62.486 62.487,62.486c34.51,-0 62.486,-27.976 62.486,-62.486l0,-224.173l80.843,80.844c24.404,24.402 63.965,24.402 88.369,-0l80.843,-80.844l0,224.173c0,34.51 27.976,62.486 62.486,62.486c34.51,-0 62.486,-27.976 62.486,-62.486l0,-375.026c0,-25.274 -15.224,-48.058 -38.573,-57.729"
                style="fill-rule: nonzero"
              ></path>
            </g>
          </svg>
        </div>
      </a>
    </div>
  </template>

  <media-controller
    part="controller"
    defaultstreamtype="{{defaultstreamtype ?? 'on-demand'}}"
    breakpoints="sm:470"
    gesturesdisabled="{{disabled}}"
    hotkeys="{{hotkeys}}"
    nohotkeys="{{nohotkeys}}"
    novolumepref="{{novolumepref}}"
    audio="{{audio}}"
    noautoseektolive="{{noautoseektolive}}"
    defaultsubtitles="{{defaultsubtitles}}"
    defaultduration="{{defaultduration ?? false}}"
    keyboardforwardseekoffset="{{forwardseekoffset}}"
    keyboardbackwardseekoffset="{{backwardseekoffset}}"
    exportparts="layer, media-layer, poster-layer, vertical-layer, centered-layer, gesture-layer"
    style="--_pre-playback-place:{{preplaybackplace ?? 'center'}}"
  >
    <slot name="media" slot="media"></slot>
    <slot name="poster" slot="poster"></slot>

    <media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>

    <template if="!audio">
      <media-error-dialog slot="dialog" noautohide></media-error-dialog>
      <!-- Pre-playback UI -->
      <!-- same for both on-demand and live -->
      <div slot="centered-chrome" class="center-controls pre-playback">
        <template if="!breakpointsm">{{>PlayButton section="center"}}</template>
        <template if="breakpointsm">{{>PrePlayButton section="center"}}</template>
      </div>

      <!-- Mux Badge -->
      <template if="proudlydisplaymuxbadge"> {{>MuxBadge}} </template>

      <!-- Autoplay centered unmute button -->
      <!--
        todo: figure out how show this with available state variables
        needs to show when:
        - autoplay is enabled
        - playback has been successful
        - audio is muted
        - in place / instead of the pre-plaback play button
        - not to show again after user has interacted with this button
          - OR user has interacted with the mute button in the control bar
      -->
      <!--
        There should be a >MuteButton to the left of the "Unmute" text, but a templating bug
        makes it appear even if commented out in the markup, add it back when code is un-commented
      -->
      <!-- <div slot="centered-chrome" class="autoplay-unmute">
        <div role="button" class="autoplay-unmute-btn">Unmute</div>
      </div> -->

      <template if="streamtype == 'on-demand'">
        <template if="breakpointsm">
          <media-control-bar part="control-bar top" slot="top-chrome">{{>TitleDisplay}} </media-control-bar>
        </template>
        {{>TimeRange}}
        <media-control-bar part="control-bar bottom">
          {{>PlayButton}} {{>SeekBackwardButton}} {{>SeekForwardButton}} {{>TimeDisplay}} {{>MuteButton}}
          {{>VolumeRange}}
          <div class="spacer"></div>
          {{>RenditionMenu}} {{>PlaybackRateMenu}} {{>AudioTrackMenu}} {{>CaptionsMenu}} {{>AirplayButton}}
          {{>CastButton}} {{>PipButton}} {{>FullscreenButton}}
        </media-control-bar>
      </template>

      <template if="streamtype == 'live'">
        <media-control-bar part="control-bar top" slot="top-chrome">
          {{>LiveButton}}
          <template if="breakpointsm"> {{>TitleDisplay}} </template>
        </media-control-bar>
        <template if="targetlivewindow > 0">{{>TimeRange}}</template>
        <media-control-bar part="control-bar bottom">
          {{>PlayButton}}
          <template if="targetlivewindow > 0">{{>SeekBackwardButton}} {{>SeekForwardButton}}</template>
          {{>MuteButton}} {{>VolumeRange}}
          <div class="spacer"></div>
          {{>RenditionMenu}} {{>AudioTrackMenu}} {{>CaptionsMenu}} {{>AirplayButton}} {{>CastButton}} {{>PipButton}}
          {{>FullscreenButton}}
        </media-control-bar>
      </template>
    </template>

    <template if="audio">
      <template if="streamtype == 'on-demand'">
        <template if="title">
          <media-control-bar part="control-bar top">{{>TitleDisplay}}</media-control-bar>
        </template>
        <media-control-bar part="control-bar bottom">
          {{>PlayButton}}
          <template if="breakpointsm"> {{>SeekBackwardButton}} {{>SeekForwardButton}} </template>
          {{>MuteButton}}
          <template if="breakpointsm">{{>VolumeRange}}</template>
          {{>TimeDisplay}} {{>TimeRange}}
          <template if="breakpointsm">{{>PlaybackRateMenu}}</template>
          {{>AirplayButton}} {{>CastButton}}
        </media-control-bar>
      </template>

      <template if="streamtype == 'live'">
        <template if="title">
          <media-control-bar part="control-bar top">{{>TitleDisplay}}</media-control-bar>
        </template>
        <media-control-bar part="control-bar bottom">
          {{>PlayButton}} {{>LiveButton section="bottom"}} {{>MuteButton}}
          <template if="breakpointsm">
            {{>VolumeRange}}
            <template if="targetlivewindow > 0"> {{>SeekBackwardButton}} {{>SeekForwardButton}} </template>
          </template>
          <template if="targetlivewindow > 0"> {{>TimeDisplay}} {{>TimeRange}} </template>
          <template if="!targetlivewindow"><div class="spacer"></div></template>
          {{>AirplayButton}} {{>CastButton}}
        </media-control-bar>
      </template>
    </template>

    <slot></slot>
  </media-controller>
</template>
`,ru=zo.createElement("template");"innerHTML"in ru&&(ru.innerHTML=PA);var _m,bm,Rf=class extends vl{};Rf.template=(bm=(_m=ru.content)==null?void 0:_m.children)==null?void 0:bm[0];Yt.customElements.get("media-theme-gerwig")||Yt.customElements.define("media-theme-gerwig",Rf);var $A="gerwig",oi={SRC:"src",POSTER:"poster"},A={STYLE:"style",DEFAULT_HIDDEN_CAPTIONS:"default-hidden-captions",PRIMARY_COLOR:"primary-color",SECONDARY_COLOR:"secondary-color",ACCENT_COLOR:"accent-color",FORWARD_SEEK_OFFSET:"forward-seek-offset",BACKWARD_SEEK_OFFSET:"backward-seek-offset",PLAYBACK_TOKEN:"playback-token",THUMBNAIL_TOKEN:"thumbnail-token",STORYBOARD_TOKEN:"storyboard-token",FULLSCREEN_ELEMENT:"fullscreen-element",DRM_TOKEN:"drm-token",STORYBOARD_SRC:"storyboard-src",THUMBNAIL_TIME:"thumbnail-time",AUDIO:"audio",NOHOTKEYS:"nohotkeys",HOTKEYS:"hotkeys",PLAYBACK_RATES:"playbackrates",DEFAULT_SHOW_REMAINING_TIME:"default-show-remaining-time",DEFAULT_DURATION:"default-duration",TITLE:"title",VIDEO_TITLE:"video-title",PLACEHOLDER:"placeholder",THEME:"theme",DEFAULT_STREAM_TYPE:"default-stream-type",TARGET_LIVE_WINDOW:"target-live-window",EXTRA_SOURCE_PARAMS:"extra-source-params",NO_VOLUME_PREF:"no-volume-pref",NO_MUTED_PREF:"no-muted-pref",CAST_RECEIVER:"cast-receiver",NO_TOOLTIPS:"no-tooltips",PROUDLY_DISPLAY_MUX_BADGE:"proudly-display-mux-badge",DISABLE_PSEUDO_ENDED:"disable-pseudo-ended"},nu=["audio","backwardseekoffset","defaultduration","defaultshowremainingtime","defaultsubtitles","noautoseektolive","disabled","exportparts","forwardseekoffset","hideduration","hotkeys","nohotkeys","playbackrates","defaultstreamtype","streamtype","style","targetlivewindow","template","title","videotitle","novolumepref","nomutedpref","proudlydisplaymuxbadge"];function UA(t,e){var i,a,r;return{src:!t.playbackId&&t.src,playbackId:t.playbackId,hasSrc:!!t.playbackId||!!t.src||!!t.currentSrc,poster:t.poster,storyboard:((i=t.media)==null?void 0:i.currentSrc)&&t.storyboard,storyboardSrc:t.getAttribute(A.STORYBOARD_SRC),fullscreenElement:t.getAttribute(A.FULLSCREEN_ELEMENT),placeholder:t.getAttribute("placeholder"),themeTemplate:BA(t),thumbnailTime:!t.tokens.thumbnail&&t.thumbnailTime,autoplay:t.autoplay,crossOrigin:t.crossOrigin,loop:t.loop,noHotKeys:t.hasAttribute(A.NOHOTKEYS),hotKeys:t.getAttribute(A.HOTKEYS),muted:t.muted,paused:t.paused,preload:t.preload,envKey:t.envKey,preferCmcd:t.preferCmcd,debug:t.debug,disableTracking:t.disableTracking,disableCookies:t.disableCookies,tokens:t.tokens,beaconCollectionDomain:t.beaconCollectionDomain,maxResolution:t.maxResolution,minResolution:t.minResolution,maxAutoResolution:t.maxAutoResolution,programStartTime:t.programStartTime,programEndTime:t.programEndTime,assetStartTime:t.assetStartTime,assetEndTime:t.assetEndTime,renditionOrder:t.renditionOrder,metadata:t.metadata,playerInitTime:t.playerInitTime,playerSoftwareName:t.playerSoftwareName,playerSoftwareVersion:t.playerSoftwareVersion,startTime:t.startTime,initialBandwidthEstimateKbps:t.initialBandwidthEstimateKbps,initialEstimateSegments:t.initialEstimateSegments,minPreloadSegments:t.minPreloadSegments,preferPlayback:t.preferPlayback,audio:t.audio,defaultStreamType:t.defaultStreamType,targetLiveWindow:t.getAttribute(f.TARGET_LIVE_WINDOW),streamType:Nc(t.getAttribute(f.STREAM_TYPE)),primaryColor:t.getAttribute(A.PRIMARY_COLOR),secondaryColor:t.getAttribute(A.SECONDARY_COLOR),accentColor:t.getAttribute(A.ACCENT_COLOR),forwardSeekOffset:t.forwardSeekOffset,backwardSeekOffset:t.backwardSeekOffset,defaultHiddenCaptions:t.defaultHiddenCaptions,defaultDuration:t.defaultDuration,defaultShowRemainingTime:t.defaultShowRemainingTime,hideDuration:WA(t),playbackRates:t.getAttribute(A.PLAYBACK_RATES),customDomain:(a=t.getAttribute(f.CUSTOM_DOMAIN))!=null?a:void 0,title:t.getAttribute(A.TITLE),videoTitle:(r=t.getAttribute(A.VIDEO_TITLE))!=null?r:t.getAttribute(A.TITLE),novolumepref:t.hasAttribute(A.NO_VOLUME_PREF),nomutedpref:t.hasAttribute(A.NO_MUTED_PREF),proudlyDisplayMuxBadge:t.hasAttribute(A.PROUDLY_DISPLAY_MUX_BADGE),castReceiver:t.castReceiver,disablePseudoEnded:t.hasAttribute(A.DISABLE_PSEUDO_ENDED),capRenditionToPlayerSize:t.capRenditionToPlayerSize,...e,extraSourceParams:t.extraSourceParams}}var HA=bv.formatErrorMessage;bv.formatErrorMessage=t=>{var e,i;if(t instanceof I){let a=xA(t,!1);return`
      ${a!=null&&a.title?`<h3>${a.title}</h3>`:""}
      ${a!=null&&a.message||a!=null&&a.linkUrl?`<p>
        ${a?.message}
        ${a!=null&&a.linkUrl?`<a
              href="${a.linkUrl}"
              target="_blank"
              rel="external noopener"
              aria-label="${(e=a.linkText)!=null?e:""} ${O("(opens in a new window)")}"
              >${(i=a.linkText)!=null?i:a.linkUrl}</a
            >`:""}
      </p>`:""}
    `}return HA(t)};function BA(t){var e,i;let a=t.theme;if(a){let r=(i=(e=t.getRootNode())==null?void 0:e.getElementById)==null?void 0:i.call(e,a);if(r&&r instanceof HTMLTemplateElement)return r;a.startsWith("media-theme-")||(a=`media-theme-${a}`);let n=Yt.customElements.get(a);if(n!=null&&n.template)return n.template}}function WA(t){var e;let i=(e=t.mediaController)==null?void 0:e.querySelector("media-time-display");return i&&getComputedStyle(i).getPropertyValue("--media-duration-display-display").trim()==="none"}function gm(t){let e=t.videoTitle?{video_title:t.videoTitle}:{};return t.getAttributeNames().filter(i=>i.startsWith("metadata-")).reduce((i,a)=>{let r=t.getAttribute(a);return r!==null&&(i[a.replace(/^metadata-/,"").replace(/-/g,"_")]=r),i},e)}var FA=Object.values(f),KA=Object.values(oi),VA=Object.values(A),ym=Tf(),Tm="mux-player",Am={isDialogOpen:!1},qA={redundant_streams:!0},fo,bn,Eo,aa,_o,gn,Qo,jo,dr,yn,ur,Zo,ue,li,Lf,su,ua,km,Sm,wm,Im,YA=class extends vm{constructor(){super(),xe(this,ue),xe(this,fo),xe(this,bn,!1),xe(this,Eo,{}),xe(this,aa,!0),xe(this,_o,new dA(this,"hotkeys")),xe(this,gn),xe(this,Qo,()=>me(this,ue,ua).call(this)),xe(this,jo,()=>me(this,ue,ua).call(this)),xe(this,dr,()=>me(this,ue,ua).call(this)),xe(this,yn),xe(this,ur,{...Am,onCloseErrorDialog:t=>{var e;((e=t.composedPath()[0])==null?void 0:e.localName)==="media-error-dialog"&&me(this,ue,su).call(this,{isDialogOpen:!1})},onFocusInErrorDialog:t=>{var e;((e=t.composedPath()[0])==null?void 0:e.localName)==="media-error-dialog"&&(gf(this,zo.activeElement)||t.preventDefault())}}),xe(this,Zo,t=>{var e;let i=(e=this.media)==null?void 0:e.error;if(!(i instanceof I)){let{message:r,code:n}=i??{};i=new I(r,n)}if(!(i!=null&&i.fatal)){si(i),i.data&&si(`${i.name} data:`,i.data);return}let a=If(i);a.message&&mm(a),et(i),i.data&&et(`${i.name} data:`,i.data),me(this,ue,su).call(this,{isDialogOpen:!0})}),qe(this,fo,_u()),this.attachShadow({mode:"open"}),me(this,ue,Lf).call(this),this.isConnected&&me(this,ue,li).call(this)}static get NAME(){return Tm}static get VERSION(){return ym}static get observedAttributes(){var t;return[...(t=vm.observedAttributes)!=null?t:[],...KA,...FA,...VA]}get mediaTheme(){var t;return(t=this.shadowRoot)==null?void 0:t.querySelector("media-theme")}get mediaController(){var t,e;return(e=(t=this.mediaTheme)==null?void 0:t.shadowRoot)==null?void 0:e.querySelector("media-controller")}connectedCallback(){me(this,ue,li).call(this);let t=this.media;t&&(t.metadata=gm(this))}disconnectedCallback(){var t,e,i,a,r,n,s,o;(t=H(this,gn))==null||t.disconnect(),(e=this.media)==null||e.removeEventListener("streamtypechange",H(this,Qo)),(i=this.media)==null||i.removeEventListener("loadstart",H(this,jo)),this.removeEventListener("error",H(this,Zo)),this.media&&(this.media.errorTranslator=void 0),(r=(a=this.media)==null?void 0:a.textTracks)==null||r.removeEventListener("addtrack",H(this,dr)),(s=(n=this.media)==null?void 0:n.textTracks)==null||s.removeEventListener("removetrack",H(this,dr)),(o=H(this,yn))==null||o.call(this),qe(this,yn,void 0),qe(this,bn,!1)}attributeChangedCallback(t,e,i){switch(me(this,ue,li).call(this),super.attributeChangedCallback(t,e,i),t){case A.HOTKEYS:H(this,_o).value=i;break;case A.THUMBNAIL_TIME:{i!=null&&this.tokens.thumbnail&&si(O("Use of thumbnail-time with thumbnail-token is currently unsupported. Ignore thumbnail-time.").toString());break}case A.THUMBNAIL_TOKEN:{if(i){let a=tr(i);if(a){let{aud:r}=a,n=un.THUMBNAIL;r!==n&&si(O("The {tokenNamePrefix}-token has an incorrect aud value: {aud}. aud value should be {expectedAud}.").format({aud:r,expectedAud:n,tokenNamePrefix:"thumbnail"}))}}break}case A.STORYBOARD_TOKEN:{if(i){let a=tr(i);if(a){let{aud:r}=a,n=un.STORYBOARD;r!==n&&si(O("The {tokenNamePrefix}-token has an incorrect aud value: {aud}. aud value should be {expectedAud}.").format({aud:r,expectedAud:n,tokenNamePrefix:"storyboard"}))}}break}case A.DRM_TOKEN:{if(i){let a=tr(i);if(a){let{aud:r}=a,n=un.DRM;r!==n&&si(O("The {tokenNamePrefix}-token has an incorrect aud value: {aud}. aud value should be {expectedAud}.").format({aud:r,expectedAud:n,tokenNamePrefix:"drm"}))}}break}case f.PLAYBACK_ID:{i!=null&&i.includes("?token")&&et(O("The specificed playback ID {playbackId} contains a token which must be provided via the playback-token attribute.").format({playbackId:i}));break}case f.STREAM_TYPE:{i&&![j.LIVE,j.ON_DEMAND,j.UNKNOWN].includes(i)?["ll-live","live:dvr","ll-live:dvr"].includes(this.streamType)?this.targetLiveWindow=i.includes("dvr")?Number.POSITIVE_INFINITY:0:mm({file:"invalid-stream-type.md",message:O("Invalid stream-type value supplied: `{streamType}`. Please provide stream-type as either: `on-demand` or `live`").format({streamType:this.streamType})}):i===j.LIVE?this.getAttribute(A.TARGET_LIVE_WINDOW)==null&&(this.targetLiveWindow=0):this.targetLiveWindow=Number.NaN;break}case A.FULLSCREEN_ELEMENT:{if(i!=null||i!==e){let a=zo.getElementById(i),r=a?.querySelector("mux-player");this.mediaController&&a&&r&&(this.mediaController.fullscreenElement=a)}break}case f.CAP_RENDITION_TO_PLAYER_SIZE:{(i==null||i!==e)&&(this.capRenditionToPlayerSize=i!=null?!0:void 0);break}}[f.PLAYBACK_ID,oi.SRC,A.PLAYBACK_TOKEN].includes(t)&&e!==i&&qe(this,ur,{...H(this,ur),...Am}),me(this,ue,ua).call(this,{[lA(t)]:i})}async requestFullscreen(t){var e;if(!(!this.mediaController||this.mediaController.hasAttribute(c.MEDIA_IS_FULLSCREEN)))return(e=this.mediaController)==null||e.dispatchEvent(new Yt.CustomEvent(L.MEDIA_ENTER_FULLSCREEN_REQUEST,{composed:!0,bubbles:!0})),new Promise((i,a)=>{var r;(r=this.mediaController)==null||r.addEventListener(Xt.MEDIA_IS_FULLSCREEN,()=>i(),{once:!0})})}async exitFullscreen(){var t;if(!(!this.mediaController||!this.mediaController.hasAttribute(c.MEDIA_IS_FULLSCREEN)))return(t=this.mediaController)==null||t.dispatchEvent(new Yt.CustomEvent(L.MEDIA_EXIT_FULLSCREEN_REQUEST,{composed:!0,bubbles:!0})),new Promise((e,i)=>{var a;(a=this.mediaController)==null||a.addEventListener(Xt.MEDIA_IS_FULLSCREEN,()=>e(),{once:!0})})}get preferCmcd(){var t;return(t=this.getAttribute(f.PREFER_CMCD))!=null?t:void 0}set preferCmcd(t){t!==this.preferCmcd&&(t?To.includes(t)?this.setAttribute(f.PREFER_CMCD,t):si(`Invalid value for preferCmcd. Must be one of ${To.join()}`):this.removeAttribute(f.PREFER_CMCD))}get hasPlayed(){var t,e;return(e=(t=this.mediaController)==null?void 0:t.hasAttribute(c.MEDIA_HAS_PLAYED))!=null?e:!1}get inLiveWindow(){var t;return(t=this.mediaController)==null?void 0:t.hasAttribute(c.MEDIA_TIME_IS_LIVE)}get _hls(){var t;return(t=this.media)==null?void 0:t._hls}get mux(){var t;return(t=this.media)==null?void 0:t.mux}get theme(){var t;return(t=this.getAttribute(A.THEME))!=null?t:$A}set theme(t){this.setAttribute(A.THEME,`${t}`)}get themeProps(){let t=this.mediaTheme;if(!t)return;let e={};for(let i of t.getAttributeNames()){if(nu.includes(i))continue;let a=t.getAttribute(i);e[_f(i)]=a===""?!0:a}return e}set themeProps(t){var e,i;me(this,ue,li).call(this);let a={...this.themeProps,...t};for(let r in a){if(nu.includes(r))continue;let n=t?.[r];typeof n=="boolean"||n==null?(e=this.mediaTheme)==null||e.toggleAttribute(au(r),!!n):(i=this.mediaTheme)==null||i.setAttribute(au(r),n)}}get playbackId(){var t;return(t=this.getAttribute(f.PLAYBACK_ID))!=null?t:void 0}set playbackId(t){t?this.setAttribute(f.PLAYBACK_ID,t):this.removeAttribute(f.PLAYBACK_ID)}get src(){var t,e;return this.playbackId?(t=Mt(this,oi.SRC))!=null?t:void 0:(e=this.getAttribute(oi.SRC))!=null?e:void 0}set src(t){t?this.setAttribute(oi.SRC,t):this.removeAttribute(oi.SRC)}get poster(){var t;let e=this.getAttribute(oi.POSTER);if(e!=null)return e;let{tokens:i}=this;if(i.playback&&!i.thumbnail){si("Missing expected thumbnail token. No poster image will be shown");return}if(this.playbackId&&!this.audio)return nA(this.playbackId,{customDomain:this.customDomain,thumbnailTime:(t=this.thumbnailTime)!=null?t:this.startTime,programTime:this.programStartTime,token:i.thumbnail})}set poster(t){t||t===""?this.setAttribute(oi.POSTER,t):this.removeAttribute(oi.POSTER)}get storyboardSrc(){var t;return(t=this.getAttribute(A.STORYBOARD_SRC))!=null?t:void 0}set storyboardSrc(t){t?this.setAttribute(A.STORYBOARD_SRC,t):this.removeAttribute(A.STORYBOARD_SRC)}get storyboard(){let{tokens:t}=this;if(this.storyboardSrc&&!t.storyboard)return this.storyboardSrc;if(!(this.audio||!this.playbackId||!this.streamType||[j.LIVE,j.UNKNOWN].includes(this.streamType)||t.playback&&!t.storyboard))return sA(this.playbackId,{customDomain:this.customDomain,token:t.storyboard,programStartTime:this.programStartTime,programEndTime:this.programEndTime})}get audio(){return this.hasAttribute(A.AUDIO)}set audio(t){if(!t){this.removeAttribute(A.AUDIO);return}this.setAttribute(A.AUDIO,"")}get hotkeys(){return H(this,_o)}get nohotkeys(){return this.hasAttribute(A.NOHOTKEYS)}set nohotkeys(t){if(!t){this.removeAttribute(A.NOHOTKEYS);return}this.setAttribute(A.NOHOTKEYS,"")}get thumbnailTime(){return Ue(this.getAttribute(A.THUMBNAIL_TIME))}set thumbnailTime(t){this.setAttribute(A.THUMBNAIL_TIME,`${t}`)}get videoTitle(){var t,e;return(e=(t=this.getAttribute(A.VIDEO_TITLE))!=null?t:this.getAttribute(A.TITLE))!=null?e:""}set videoTitle(t){t!==this.videoTitle&&(t?this.setAttribute(A.VIDEO_TITLE,t):this.removeAttribute(A.VIDEO_TITLE))}get placeholder(){var t;return(t=Mt(this,A.PLACEHOLDER))!=null?t:""}set placeholder(t){this.setAttribute(A.PLACEHOLDER,`${t}`)}get primaryColor(){var t,e;let i=this.getAttribute(A.PRIMARY_COLOR);if(i!=null||this.mediaTheme&&(i=(e=(t=Yt.getComputedStyle(this.mediaTheme))==null?void 0:t.getPropertyValue("--_primary-color"))==null?void 0:e.trim(),i))return i}set primaryColor(t){this.setAttribute(A.PRIMARY_COLOR,`${t}`)}get secondaryColor(){var t,e;let i=this.getAttribute(A.SECONDARY_COLOR);if(i!=null||this.mediaTheme&&(i=(e=(t=Yt.getComputedStyle(this.mediaTheme))==null?void 0:t.getPropertyValue("--_secondary-color"))==null?void 0:e.trim(),i))return i}set secondaryColor(t){this.setAttribute(A.SECONDARY_COLOR,`${t}`)}get accentColor(){var t,e;let i=this.getAttribute(A.ACCENT_COLOR);if(i!=null||this.mediaTheme&&(i=(e=(t=Yt.getComputedStyle(this.mediaTheme))==null?void 0:t.getPropertyValue("--_accent-color"))==null?void 0:e.trim(),i))return i}set accentColor(t){this.setAttribute(A.ACCENT_COLOR,`${t}`)}get defaultShowRemainingTime(){return this.hasAttribute(A.DEFAULT_SHOW_REMAINING_TIME)}set defaultShowRemainingTime(t){t?this.setAttribute(A.DEFAULT_SHOW_REMAINING_TIME,""):this.removeAttribute(A.DEFAULT_SHOW_REMAINING_TIME)}get playbackRates(){if(this.hasAttribute(A.PLAYBACK_RATES))return this.getAttribute(A.PLAYBACK_RATES).trim().split(/\s*,?\s+/).map(t=>Number(t)).filter(t=>!Number.isNaN(t)).sort((t,e)=>t-e)}set playbackRates(t){if(!t){this.removeAttribute(A.PLAYBACK_RATES);return}this.setAttribute(A.PLAYBACK_RATES,t.join(" "))}get forwardSeekOffset(){var t;return(t=Ue(this.getAttribute(A.FORWARD_SEEK_OFFSET)))!=null?t:10}set forwardSeekOffset(t){this.setAttribute(A.FORWARD_SEEK_OFFSET,`${t}`)}get backwardSeekOffset(){var t;return(t=Ue(this.getAttribute(A.BACKWARD_SEEK_OFFSET)))!=null?t:10}set backwardSeekOffset(t){this.setAttribute(A.BACKWARD_SEEK_OFFSET,`${t}`)}get defaultHiddenCaptions(){return this.hasAttribute(A.DEFAULT_HIDDEN_CAPTIONS)}set defaultHiddenCaptions(t){t?this.setAttribute(A.DEFAULT_HIDDEN_CAPTIONS,""):this.removeAttribute(A.DEFAULT_HIDDEN_CAPTIONS)}get defaultDuration(){return Ue(this.getAttribute(A.DEFAULT_DURATION))}set defaultDuration(t){t==null?this.removeAttribute(A.DEFAULT_DURATION):this.setAttribute(A.DEFAULT_DURATION,`${t}`)}get playerInitTime(){return this.hasAttribute(f.PLAYER_INIT_TIME)?Ue(this.getAttribute(f.PLAYER_INIT_TIME)):H(this,fo)}set playerInitTime(t){t!=this.playerInitTime&&(t==null?this.removeAttribute(f.PLAYER_INIT_TIME):this.setAttribute(f.PLAYER_INIT_TIME,`${+t}`))}get playerSoftwareName(){var t;return(t=this.getAttribute(f.PLAYER_SOFTWARE_NAME))!=null?t:Tm}get playerSoftwareVersion(){var t;return(t=this.getAttribute(f.PLAYER_SOFTWARE_VERSION))!=null?t:ym}get beaconCollectionDomain(){var t;return(t=this.getAttribute(f.BEACON_COLLECTION_DOMAIN))!=null?t:void 0}set beaconCollectionDomain(t){t!==this.beaconCollectionDomain&&(t?this.setAttribute(f.BEACON_COLLECTION_DOMAIN,t):this.removeAttribute(f.BEACON_COLLECTION_DOMAIN))}get maxResolution(){var t;return(t=this.getAttribute(f.MAX_RESOLUTION))!=null?t:void 0}set maxResolution(t){t!==this.maxResolution&&(t?this.setAttribute(f.MAX_RESOLUTION,t):this.removeAttribute(f.MAX_RESOLUTION))}get minResolution(){var t;return(t=this.getAttribute(f.MIN_RESOLUTION))!=null?t:void 0}set minResolution(t){t!==this.minResolution&&(t?this.setAttribute(f.MIN_RESOLUTION,t):this.removeAttribute(f.MIN_RESOLUTION))}get maxAutoResolution(){var t;return(t=this.getAttribute(f.MAX_AUTO_RESOLUTION))!=null?t:void 0}set maxAutoResolution(t){t==null?this.removeAttribute(f.MAX_AUTO_RESOLUTION):this.setAttribute(f.MAX_AUTO_RESOLUTION,t)}get renditionOrder(){var t;return(t=this.getAttribute(f.RENDITION_ORDER))!=null?t:void 0}set renditionOrder(t){t!==this.renditionOrder&&(t?this.setAttribute(f.RENDITION_ORDER,t):this.removeAttribute(f.RENDITION_ORDER))}get programStartTime(){return Ue(this.getAttribute(f.PROGRAM_START_TIME))}set programStartTime(t){t==null?this.removeAttribute(f.PROGRAM_START_TIME):this.setAttribute(f.PROGRAM_START_TIME,`${t}`)}get programEndTime(){return Ue(this.getAttribute(f.PROGRAM_END_TIME))}set programEndTime(t){t==null?this.removeAttribute(f.PROGRAM_END_TIME):this.setAttribute(f.PROGRAM_END_TIME,`${t}`)}get assetStartTime(){return Ue(this.getAttribute(f.ASSET_START_TIME))}set assetStartTime(t){t==null?this.removeAttribute(f.ASSET_START_TIME):this.setAttribute(f.ASSET_START_TIME,`${t}`)}get assetEndTime(){return Ue(this.getAttribute(f.ASSET_END_TIME))}set assetEndTime(t){t==null?this.removeAttribute(f.ASSET_END_TIME):this.setAttribute(f.ASSET_END_TIME,`${t}`)}get extraSourceParams(){return this.hasAttribute(A.EXTRA_SOURCE_PARAMS)?[...new URLSearchParams(this.getAttribute(A.EXTRA_SOURCE_PARAMS)).entries()].reduce((t,[e,i])=>(t[e]=i,t),{}):qA}set extraSourceParams(t){t==null?this.removeAttribute(A.EXTRA_SOURCE_PARAMS):this.setAttribute(A.EXTRA_SOURCE_PARAMS,new URLSearchParams(t).toString())}get customDomain(){var t;return(t=this.getAttribute(f.CUSTOM_DOMAIN))!=null?t:void 0}set customDomain(t){t!==this.customDomain&&(t?this.setAttribute(f.CUSTOM_DOMAIN,t):this.removeAttribute(f.CUSTOM_DOMAIN))}get envKey(){var t;return(t=Mt(this,f.ENV_KEY))!=null?t:void 0}set envKey(t){this.setAttribute(f.ENV_KEY,`${t}`)}get noVolumePref(){return this.hasAttribute(A.NO_VOLUME_PREF)}set noVolumePref(t){t?this.setAttribute(A.NO_VOLUME_PREF,""):this.removeAttribute(A.NO_VOLUME_PREF)}get noMutedPref(){return this.hasAttribute(A.NO_MUTED_PREF)}set noMutedPref(t){t?this.setAttribute(A.NO_MUTED_PREF,""):this.removeAttribute(A.NO_MUTED_PREF)}get debug(){return Mt(this,f.DEBUG)!=null}set debug(t){t?this.setAttribute(f.DEBUG,""):this.removeAttribute(f.DEBUG)}get disableTracking(){return Mt(this,f.DISABLE_TRACKING)!=null}set disableTracking(t){this.toggleAttribute(f.DISABLE_TRACKING,!!t)}get disableCookies(){return Mt(this,f.DISABLE_COOKIES)!=null}set disableCookies(t){t?this.setAttribute(f.DISABLE_COOKIES,""):this.removeAttribute(f.DISABLE_COOKIES)}get streamType(){var t,e,i;return(i=(e=this.getAttribute(f.STREAM_TYPE))!=null?e:(t=this.media)==null?void 0:t.streamType)!=null?i:j.UNKNOWN}set streamType(t){this.setAttribute(f.STREAM_TYPE,`${t}`)}get defaultStreamType(){var t,e,i;return(i=(e=this.getAttribute(A.DEFAULT_STREAM_TYPE))!=null?e:(t=this.mediaController)==null?void 0:t.getAttribute(A.DEFAULT_STREAM_TYPE))!=null?i:j.ON_DEMAND}set defaultStreamType(t){t?this.setAttribute(A.DEFAULT_STREAM_TYPE,t):this.removeAttribute(A.DEFAULT_STREAM_TYPE)}get targetLiveWindow(){var t,e;return this.hasAttribute(A.TARGET_LIVE_WINDOW)?+this.getAttribute(A.TARGET_LIVE_WINDOW):(e=(t=this.media)==null?void 0:t.targetLiveWindow)!=null?e:Number.NaN}set targetLiveWindow(t){t==this.targetLiveWindow||Number.isNaN(t)&&Number.isNaN(this.targetLiveWindow)||(t==null?this.removeAttribute(A.TARGET_LIVE_WINDOW):this.setAttribute(A.TARGET_LIVE_WINDOW,`${+t}`))}get liveEdgeStart(){var t;return(t=this.media)==null?void 0:t.liveEdgeStart}get startTime(){return Ue(Mt(this,f.START_TIME))}set startTime(t){this.setAttribute(f.START_TIME,`${t}`)}get initialBandwidthEstimateKbps(){return Ue(Mt(this,f.INITIAL_BANDWIDTH_ESTIMATE_KBPS))}set initialBandwidthEstimateKbps(t){t==null?this.removeAttribute(f.INITIAL_BANDWIDTH_ESTIMATE_KBPS):this.setAttribute(f.INITIAL_BANDWIDTH_ESTIMATE_KBPS,`${t}`)}get initialEstimateSegments(){return Ue(Mt(this,f.INITIAL_ESTIMATE_SEGMENTS))}set initialEstimateSegments(t){t==null?this.removeAttribute(f.INITIAL_ESTIMATE_SEGMENTS):this.setAttribute(f.INITIAL_ESTIMATE_SEGMENTS,`${t}`)}get minPreloadSegments(){return Ue(Mt(this,f.MIN_PRELOAD_SEGMENTS))}set minPreloadSegments(t){t==null?this.removeAttribute(f.MIN_PRELOAD_SEGMENTS):this.setAttribute(f.MIN_PRELOAD_SEGMENTS,`${t}`)}get preferPlayback(){let t=this.getAttribute(f.PREFER_PLAYBACK);if(t===Gt.MSE||t===Gt.NATIVE)return t}set preferPlayback(t){t!==this.preferPlayback&&(t===Gt.MSE||t===Gt.NATIVE?this.setAttribute(f.PREFER_PLAYBACK,t):this.removeAttribute(f.PREFER_PLAYBACK))}get metadata(){var t;return(t=this.media)==null?void 0:t.metadata}set metadata(t){if(me(this,ue,li).call(this),!this.media){et("underlying media element missing when trying to set metadata. metadata will not be set.");return}this.media.metadata={...gm(this),...t}}get _hlsConfig(){var t;return(t=this.media)==null?void 0:t._hlsConfig}set _hlsConfig(t){if(me(this,ue,li).call(this),!this.media){et("underlying media element missing when trying to set _hlsConfig. _hlsConfig will not be set.");return}this.media._hlsConfig=t}async addCuePoints(t){var e;if(me(this,ue,li).call(this),!this.media){et("underlying media element missing when trying to addCuePoints. cuePoints will not be added.");return}return(e=this.media)==null?void 0:e.addCuePoints(t)}get activeCuePoint(){var t;return(t=this.media)==null?void 0:t.activeCuePoint}get cuePoints(){var t,e;return(e=(t=this.media)==null?void 0:t.cuePoints)!=null?e:[]}addChapters(t){var e;if(me(this,ue,li).call(this),!this.media){et("underlying media element missing when trying to addChapters. chapters will not be added.");return}return(e=this.media)==null?void 0:e.addChapters(t)}get activeChapter(){var t;return(t=this.media)==null?void 0:t.activeChapter}get chapters(){var t,e;return(e=(t=this.media)==null?void 0:t.chapters)!=null?e:[]}getStartDate(){var t;return(t=this.media)==null?void 0:t.getStartDate()}get currentPdt(){var t;return(t=this.media)==null?void 0:t.currentPdt}get tokens(){let t=this.getAttribute(A.PLAYBACK_TOKEN),e=this.getAttribute(A.DRM_TOKEN),i=this.getAttribute(A.THUMBNAIL_TOKEN),a=this.getAttribute(A.STORYBOARD_TOKEN);return{...H(this,Eo),...t!=null?{playback:t}:{},...e!=null?{drm:e}:{},...i!=null?{thumbnail:i}:{},...a!=null?{storyboard:a}:{}}}set tokens(t){qe(this,Eo,t??{})}get playbackToken(){var t;return(t=this.getAttribute(A.PLAYBACK_TOKEN))!=null?t:void 0}set playbackToken(t){this.setAttribute(A.PLAYBACK_TOKEN,`${t}`)}get drmToken(){var t;return(t=this.getAttribute(A.DRM_TOKEN))!=null?t:void 0}set drmToken(t){this.setAttribute(A.DRM_TOKEN,`${t}`)}get thumbnailToken(){var t;return(t=this.getAttribute(A.THUMBNAIL_TOKEN))!=null?t:void 0}set thumbnailToken(t){this.setAttribute(A.THUMBNAIL_TOKEN,`${t}`)}get storyboardToken(){var t;return(t=this.getAttribute(A.STORYBOARD_TOKEN))!=null?t:void 0}set storyboardToken(t){this.setAttribute(A.STORYBOARD_TOKEN,`${t}`)}addTextTrack(t,e,i,a){var r;let n=(r=this.media)==null?void 0:r.nativeEl;if(n)return pu(n,t,e,i,a)}removeTextTrack(t){var e;let i=(e=this.media)==null?void 0:e.nativeEl;if(i)return Mb(i,t)}get textTracks(){var t;return(t=this.media)==null?void 0:t.textTracks}get castReceiver(){var t;return(t=this.getAttribute(A.CAST_RECEIVER))!=null?t:void 0}set castReceiver(t){t!==this.castReceiver&&(t?this.setAttribute(A.CAST_RECEIVER,t):this.removeAttribute(A.CAST_RECEIVER))}get castCustomData(){var t;return(t=this.media)==null?void 0:t.castCustomData}set castCustomData(t){if(!this.media){et("underlying media element missing when trying to set castCustomData. castCustomData will not be set.");return}this.media.castCustomData=t}get noTooltips(){return this.hasAttribute(A.NO_TOOLTIPS)}set noTooltips(t){if(!t){this.removeAttribute(A.NO_TOOLTIPS);return}this.setAttribute(A.NO_TOOLTIPS,"")}get proudlyDisplayMuxBadge(){return this.hasAttribute(A.PROUDLY_DISPLAY_MUX_BADGE)}set proudlyDisplayMuxBadge(t){t?this.setAttribute(A.PROUDLY_DISPLAY_MUX_BADGE,""):this.removeAttribute(A.PROUDLY_DISPLAY_MUX_BADGE)}get capRenditionToPlayerSize(){var t;return(t=this.media)==null?void 0:t.capRenditionToPlayerSize}set capRenditionToPlayerSize(t){if(!this.media){et("underlying media element missing when trying to set capRenditionToPlayerSize");return}this.media.capRenditionToPlayerSize=t}};fo=new WeakMap,bn=new WeakMap,Eo=new WeakMap,aa=new WeakMap,_o=new WeakMap,gn=new WeakMap,Qo=new WeakMap,jo=new WeakMap,dr=new WeakMap,yn=new WeakMap,ur=new WeakMap,Zo=new WeakMap,ue=new WeakSet,li=function(){var t,e,i,a;if(!H(this,bn)){qe(this,bn,!0),me(this,ue,ua).call(this);try{if(customElements.upgrade(this.mediaTheme),!(this.mediaTheme instanceof Yt.HTMLElement))throw""}catch{et("<media-theme> failed to upgrade!")}try{customElements.upgrade(this.media)}catch{et("underlying media element failed to upgrade!")}try{if(customElements.upgrade(this.mediaController),!(this.mediaController instanceof u1))throw""}catch{et("<media-controller> failed to upgrade!")}me(this,ue,km).call(this),me(this,ue,Sm).call(this),me(this,ue,wm).call(this),qe(this,aa,(e=(t=this.mediaController)==null?void 0:t.hasAttribute(N.USER_INACTIVE))!=null?e:!0),me(this,ue,Im).call(this),(i=this.media)==null||i.addEventListener("streamtypechange",H(this,Qo)),(a=this.media)==null||a.addEventListener("loadstart",H(this,jo))}},Lf=function(){var t,e;try{(t=window?.CSS)==null||t.registerProperty({name:"--media-primary-color",syntax:"<color>",inherits:!0}),(e=window?.CSS)==null||e.registerProperty({name:"--media-secondary-color",syntax:"<color>",inherits:!0})}catch{}},su=function(t){Object.assign(H(this,ur),t),me(this,ue,ua).call(this)},ua=function(t={}){SA(IA(UA(this,{...H(this,ur),...t})),this.shadowRoot)},km=function(){let t=e=>{var i,a;if(!(e!=null&&e.startsWith("theme-")))return;let r=e.replace(/^theme-/,"");if(nu.includes(r))return;let n=this.getAttribute(e);n!=null?(i=this.mediaTheme)==null||i.setAttribute(r,n):(a=this.mediaTheme)==null||a.removeAttribute(r)};qe(this,gn,new MutationObserver(e=>{for(let{attributeName:i}of e)t(i)})),H(this,gn).observe(this,{attributes:!0}),this.getAttributeNames().forEach(t)},Sm=function(){this.addEventListener("error",H(this,Zo)),this.media&&(this.media.errorTranslator=(t={})=>{var e,i,a;if(!(((e=this.media)==null?void 0:e.error)instanceof I))return t;let r=If((i=this.media)==null?void 0:i.error);return{player_error_code:(a=this.media)==null?void 0:a.error.code,player_error_message:r.message?String(r.message):t.player_error_message,player_error_context:r.context?String(r.context):t.player_error_context}})},wm=function(){var t,e,i,a;(e=(t=this.media)==null?void 0:t.textTracks)==null||e.addEventListener("addtrack",H(this,dr)),(a=(i=this.media)==null?void 0:i.textTracks)==null||a.addEventListener("removetrack",H(this,dr))},Im=function(){var t,e;if(!/Firefox/i.test(navigator.userAgent))return;let i,a=new WeakMap,r=()=>this.streamType===j.LIVE&&!this.secondaryColor&&this.offsetWidth>=800,n=(u,m,p=!1)=>{r()||Array.from(u&&u.activeCues||[]).forEach(h=>{if(!(!h.snapToLines||h.line<-5||h.line>=0&&h.line<10))if(!m||this.paused){let d=h.text.split(`
`).length,v=-3;this.streamType===j.LIVE&&(v=-2);let E=v-d;if(h.line===E&&!p)return;a.has(h)||a.set(h,h.line),h.line=E}else setTimeout(()=>{h.line=a.get(h)||"auto"},500)})},s=()=>{var u,m;n(i,(m=(u=this.mediaController)==null?void 0:u.hasAttribute(N.USER_INACTIVE))!=null?m:!1)},o=()=>{var u,m;let p=Array.from(((m=(u=this.mediaController)==null?void 0:u.media)==null?void 0:m.textTracks)||[]).filter(h=>["subtitles","captions"].includes(h.kind)&&h.mode==="showing")[0];p!==i&&i?.removeEventListener("cuechange",s),i=p,i?.addEventListener("cuechange",s),n(i,H(this,aa))};o(),(t=this.textTracks)==null||t.addEventListener("change",o),(e=this.textTracks)==null||e.addEventListener("addtrack",o);let l=()=>{var u,m;let p=(m=(u=this.mediaController)==null?void 0:u.hasAttribute(N.USER_INACTIVE))!=null?m:!0;H(this,aa)!==p&&(qe(this,aa,p),n(i,H(this,aa)))};this.addEventListener("userinactivechange",l),qe(this,yn,()=>{var u,m;i?.removeEventListener("cuechange",s),(u=this.textTracks)==null||u.removeEventListener("change",o),(m=this.textTracks)==null||m.removeEventListener("addtrack",o),this.removeEventListener("userinactivechange",l)})};function Mt(t,e){return t.media?t.media.getAttribute(e):t.getAttribute(e)}var Rm=YA,Cf=class{addEventListener(){}removeEventListener(){}dispatchEvent(t){return!0}};if(typeof DocumentFragment>"u"){class t extends Cf{}globalThis.DocumentFragment=t}var GA=class extends Cf{},zA={get(t){},define(t,e,i){},getName(t){return null},upgrade(t){},whenDefined(t){return Promise.resolve(GA)}},QA={customElements:zA},jA=typeof window>"u"||typeof globalThis.customElements>"u",Wl=jA?QA:globalThis;Wl.customElements.get("mux-player")||(Wl.customElements.define("mux-player",Rm),Wl.MuxPlayerElement=Rm);var Df=parseInt(Tn.version)>=19,Lm={className:"class",classname:"class",htmlFor:"for",crossOrigin:"crossorigin",viewBox:"viewBox",playsInline:"playsinline",autoPlay:"autoplay",playbackRate:"playbackrate"},ZA=t=>t==null,XA=(t,e)=>ZA(e)?!1:t in e,JA=t=>t.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`),ek=(t,e)=>{if(!(!Df&&typeof e=="boolean"&&!e)){if(XA(t,Lm))return Lm[t];if(typeof e<"u")return/[A-Z]/.test(t)?JA(t):t}},tk=(t,e)=>!Df&&typeof t=="boolean"?"":t,ik=(t={})=>{let{ref:e,...i}=t;return Object.entries(i).reduce((a,[r,n])=>{let s=ek(r,n);if(!s)return a;let o=tk(n);return a[s]=o,a},{})};function Cm(t,e){if(typeof t=="function")return t(e);t!=null&&(t.current=e)}function ak(...t){return e=>{let i=!1,a=t.map(r=>{let n=Cm(r,e);return!i&&typeof n=="function"&&(i=!0),n});if(i)return()=>{for(let r=0;r<a.length;r++){let n=a[r];typeof n=="function"?n():Cm(t[r],null)}}}}function rk(...t){return An.useCallback(ak(...t),t)}var nk=Object.prototype.hasOwnProperty,sk=(t,e)=>{if(Object.is(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;if(Array.isArray(t))return!Array.isArray(e)||t.length!==e.length?!1:t.some((r,n)=>e[n]===r);let i=Object.keys(t),a=Object.keys(e);if(i.length!==a.length)return!1;for(let r=0;r<i.length;r++)if(!nk.call(e,i[r])||!Object.is(t[i[r]],e[i[r]]))return!1;return!0},Mf=(t,e,i)=>!sk(e,t[i]),ok=(t,e,i)=>{t[i]=e},lk=(t,e,i,a=ok,r=Mf)=>An.useEffect(()=>{let n=i?.current;n&&r(n,e,t)&&a(n,e,t)},[i?.current,e]),Ot=lk,dk=()=>{try{return"3.13.0"}catch{}return"UNKNOWN"},uk=dk(),ck=()=>uk,re=(t,e,i)=>An.useEffect(()=>{let a=e?.current;if(!a||!i)return;let r=t,n=i;return a.addEventListener(r,n),()=>{a.removeEventListener(r,n)}},[e?.current,i,t]),hk=Tn.forwardRef(({children:t,...e},i)=>Tn.createElement("mux-player",{suppressHydrationWarning:!0,...ik(e),ref:i},t)),mk=(t,e)=>{let{onAbort:i,onCanPlay:a,onCanPlayThrough:r,onEmptied:n,onLoadStart:s,onLoadedData:o,onLoadedMetadata:l,onProgress:u,onDurationChange:m,onVolumeChange:p,onRateChange:h,onResize:d,onWaiting:v,onPlay:E,onPlaying:b,onTimeUpdate:y,onPause:T,onSeeking:g,onSeeked:k,onStalled:D,onSuspend:C,onEnded:$,onError:B,onCuePointChange:G,onChapterChange:W,metadata:U,tokens:Ne,paused:ze,playbackId:Qe,playbackRates:ve,currentTime:He,themeProps:Rt,extraSourceParams:Be,castCustomData:mt,_hlsConfig:je,...we}=e;return Ot("tokens",Ne,t),Ot("playbackId",Qe,t),Ot("playbackRates",ve,t),Ot("metadata",U,t),Ot("extraSourceParams",Be,t),Ot("_hlsConfig",je,t),Ot("themeProps",Rt,t),Ot("castCustomData",mt,t),Ot("paused",ze,t,(Pe,We)=>{We!=null&&(We?Pe.pause():Pe.play())},(Pe,We,ei)=>Pe.hasAttribute("autoplay")&&!Pe.hasPlayed?!1:Mf(Pe,We,ei)),Ot("currentTime",He,t,(Pe,We)=>{We!=null&&(Pe.currentTime=We)}),re("abort",t,i),re("canplay",t,a),re("canplaythrough",t,r),re("emptied",t,n),re("loadstart",t,s),re("loadeddata",t,o),re("loadedmetadata",t,l),re("progress",t,u),re("durationchange",t,m),re("volumechange",t,p),re("ratechange",t,h),re("resize",t,d),re("waiting",t,v),re("play",t,E),re("playing",t,b),re("timeupdate",t,y),re("pause",t,T),re("seeking",t,g),re("seeked",t,k),re("stalled",t,D),re("suspend",t,C),re("ended",t,$),re("error",t,B),re("cuepointchange",t,G),re("chapterchange",t,W),[we]},pk=ck(),vk="mux-player-react",fk=Tn.forwardRef((t,e)=>{var i;let a=An.useRef(null),r=rk(a,e),[n]=mk(a,t),[s]=An.useState((i=t.playerInitTime)!=null?i:_u());return Tn.createElement(hk,{ref:r,defaultHiddenCaptions:t.defaultHiddenCaptions,playerSoftwareName:vk,playerSoftwareVersion:pk,playerInitTime:s,...n})}),Nk=fk;export{Tk as MaxResolution,I as MediaError,Ak as MinResolution,kk as RenditionOrder,Nk as default,_u as generatePlayerInitTime,vk as playerSoftwareName,pk as playerSoftwareVersion};
