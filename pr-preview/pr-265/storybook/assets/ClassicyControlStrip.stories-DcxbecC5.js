import{r as i,ao as j,ab as W,f as v,ap as V,aq as U,ar as q,as as B,z as T,at as $,au as z,j as l,i as K,ac as G,k as X}from"./iframe-D1zGhoeH.js";import{d as H}from"./helpers-7BaRso7q.js";import"./preload-helper-ebRTegvm.js";const I={id:"spacer"},F=(t,s,n)=>({id:`open-${n.id}`,title:`Open ${s} Control Panel`,onClickFunc:()=>t({type:"ClassicyAppOpen",app:n})}),Y=()=>{const{disabled:t}=j(),s=W(),n=T(),o=t.includes("*");return i.useMemo(()=>{const c=r=>s({type:"ClassicySoundDisable",disabled:r?["*"]:[]}),p=v.controlPanels.soundManager;return{id:"classicy-sound",label:"Sound",icon:o?p.soundOff:p.soundOn,menuItems:[{id:"sound-on",title:"Sound On",checked:!o,onClickFunc:()=>c(!1)},{id:"sound-off",title:"Sound Off",checked:o,onClickFunc:()=>c(!0)},I,F(n,"Sound",{id:$,name:"Sound Manager",icon:p.app})]}},[o,s,n])},J=()=>{const t=T(),s=V(c=>c.System.Manager.Applications.apps[U]?.data),n=s?.enabled??!0,o=s?.timeoutMinutes??q;return i.useMemo(()=>{const c=v.system.extensions.screensaver;return{id:"classicy-screen-saver",label:"Screen Saver",icon:c,menuItems:[{id:"screen-saver-status",title:n?`Starts After ${o} Minute${o===1?"":"s"} Idle`:"Screen Saver Is Off",disabled:!0,className:"classicyControlStripStatus"},I,{id:"screen-saver-sleep-now",title:"Sleep Now",disabled:!n,onClickFunc:()=>t({type:B})},{id:"screen-saver-enabled",title:"Screen Saver On",checked:n,onClickFunc:()=>t({type:"ClassicyAppScreenSaverSetEnabled",enabled:!n})},I,F(t,"Screen Saver",{id:z,name:"Screen Saver",icon:c})]}},[n,o,t])},k=()=>{const t=Y(),s=J();return i.useMemo(()=>[t,s],[t,s])},Q=3,O=24,D=t=>t?.querySelector(".classicyControlStripModule")?.offsetWidth||O,N=(t,s)=>Math.max(D(t),Math.min(s,t?.scrollWidth||s)),M=({modules:t,defaultCollapsed:s=!1,defaultWidth:n,className:o})=>{const c=k(),p=t??c,[r,g]=i.useState(s),[A,w]=i.useState(n??null),[E,R]=i.useState({left:!1,right:!1}),m=i.useRef(null),h=i.useRef(null),y=i.useCallback(()=>{const e=m.current;if(!e)return;const a=e.scrollLeft>0,d=e.scrollLeft+e.clientWidth<e.scrollWidth-1;R(u=>u.left===a&&u.right===d?u:{left:a,right:d})},[]);i.useLayoutEffect(()=>{y()},[A,r,p.length,y]);const x=e=>{const a=m.current;a&&(a.scrollLeft+=e*D(a),y())},P=e=>{e.button===0&&(e.preventDefault(),h.current={startX:e.clientX,startWidth:m.current?.clientWidth??0,moved:!1})};i.useEffect(()=>{const e=d=>{const u=h.current;if(!u)return;const _=d.clientX-u.startX;if(!(!u.moved&&Math.abs(_)<=Q)){if(u.moved=!0,r){h.current=null,g(!1);return}w(N(m.current,u.startWidth+_))}},a=()=>{const d=h.current;h.current=null,d&&!d.moved&&g(u=>!u)};return document.addEventListener("mousemove",e),document.addEventListener("mouseup",a),()=>{document.removeEventListener("mousemove",e),document.removeEventListener("mouseup",a)}},[r]);const L=e=>{if(r||e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();const a=m.current,d=a?.clientWidth??0;w(N(a,d+(e.key==="ArrowRight"?1:-1)*O))};return l.jsxs("div",{role:"toolbar","aria-label":"Control Strip",className:G("classicyControlStrip",r&&"classicyControlStripCollapsed",o),children:[!r&&l.jsxs(l.Fragment,{children:[l.jsx("button",{type:"button",className:"classicyControlStripCollapseBox","aria-label":"Collapse Control Strip",onClick:()=>g(!0)}),l.jsx("button",{type:"button",className:"classicyControlStripScroll classicyControlStripScrollLeft","aria-label":"Scroll Control Strip left",disabled:!E.left,onClick:()=>x(-1)}),l.jsx("div",{ref:m,className:"classicyControlStripModules",style:A===null?void 0:{width:A},onScroll:y,children:p.map(e=>l.jsx(K,{mode:"popup",bevelWidth:"small",className:"classicyControlStripModule",icon:e.icon,"aria-label":e.label,popupArrow:"small",popupDirection:"horizontal",popupPlacement:"below",menuItems:e.menuItems,popupContent:e.content},e.id))}),l.jsx("button",{type:"button",className:"classicyControlStripScroll classicyControlStripScrollRight","aria-label":"Scroll Control Strip right",disabled:!E.right,onClick:()=>x(1)})]}),l.jsx("button",{type:"button",className:"classicyControlStripTab","aria-label":r?"Expand Control Strip":"Collapse or resize Control Strip","aria-expanded":!r,onMouseDown:P,onClick:e=>{e.detail===0&&g(a=>!a)},onKeyDown:L})]})};M.__docgenInfo={description:`The Mac OS 8 Control Strip (HIGOS8 Ch.6 "Persistent Access", p.125, Figure
6-15): a floating strip pinned to the lower left of the desktop that keeps
small module buttons within reach while their control panels are closed.

From left to right: a collapse box, a scroll arrow, the modules, a scroll
arrow and the tab. The collapse box tucks the strip down to the tab; a click
on the tab collapses or expands it, and dragging the tab sizes it. When the
modules do not fit, the scroll arrows step through them. Each module is a
pop-up bevel button, so its menu opens above the strip and behaves as a
standard or sticky menu.

Mount it as a child of ClassicyDesktop.`,methods:[],displayName:"ClassicyControlStrip",props:{modules:{required:!1,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
	id: string;
	/** Module icon, drawn at 16 px. */
	icon: string;
	/** Accessible name ("Sound"). */
	label: string;
	/**
	 * The module's menu. A disabled item with the \`classicyControlStripStatus\`
	 * class renders as an italic status line, like Figure 6-15's
	 * "No Users Connected".
	 */
	menuItems?: ClassicyMenuItem[];
	/** A surface other than a menu. Ignored when \`menuItems\` is set. */
	content?: ReactNode;
}`,signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"icon",value:{name:"string",required:!0},description:"Module icon, drawn at 16 px."},{key:"label",value:{name:"string",required:!0},description:'Accessible name ("Sound").'},{key:"menuItems",value:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]",required:!1},description:`The module's menu. A disabled item with the \`classicyControlStripStatus\`
class renders as an italic status line, like Figure 6-15's
"No Users Connected".`},{key:"content",value:{name:"ReactNode",required:!1},description:"A surface other than a menu. Ignored when `menuItems` is set."}]}}],raw:"ClassicyControlStripModule[]"},description:"Modules to show, left to right. Defaults to the built-in modules for\nClassicy's own control panels (`useClassicyDefaultControlStripModules`)."},defaultCollapsed:{required:!1,tsType:{name:"boolean"},description:"Start collapsed to the tab alone.",defaultValue:{value:"false",computed:!1}},defaultWidth:{required:!1,tsType:{name:"number"},description:`Starting width of the module area, in px; the user resizes it by dragging
the tab. Omitted, the strip opens wide enough for every module.`},className:{required:!1,tsType:{name:"string"},description:""}}};const{fn:Z}=__STORYBOOK_MODULE_TEST__,ne={title:"Desktop/ControlStrip",component:M,parameters:H},S={},f={render:()=>{const[t,s]=i.useState(!1),[n,o]=i.useState(70),c=k(),p=[{id:"file-sharing",label:"File Sharing",icon:v.system.extensions.appleShare,menuItems:[{id:"file-sharing-status",title:t?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:Z()},{id:"spacer"},{id:"file-sharing-toggle",title:t?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>s(r=>!r)}]},{id:"volume",label:"Volume",icon:v.controlPanels.soundManager.sound66,content:l.jsx("div",{style:{height:110,paddingBottom:20},children:l.jsx(X,{id:"control-strip-volume",ariaLabel:"Volume",orientation:"vertical",value:n,onChangeFunc:r=>o(Number(r.target.value))})})},...c];return l.jsx(M,{modules:p})}},C={render:()=>{const t=k(),s=Array.from({length:6},(n,o)=>({...t[o%t.length],id:`module-${o}`}));return l.jsx(M,{modules:s,defaultWidth:90})}},b={args:{defaultCollapsed:!0}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:"{}",...S.parameters?.docs?.source},description:{story:"The built-in Sound and Screen Saver modules.",...S.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [sharing, setSharing] = useState(false);
    const [volume, setVolume] = useState(70);
    const builtIns = useClassicyDefaultControlStripModules();
    const modules: ClassicyControlStripModule[] = [{
      id: "file-sharing",
      label: "File Sharing",
      icon: ClassicyIcons.system.extensions.appleShare,
      menuItems: [{
        id: "file-sharing-status",
        title: sharing ? "1 User Connected" : "No Users Connected",
        disabled: true,
        className: "classicyControlStripStatus"
      }, {
        id: "spacer"
      }, {
        id: "file-sharing-open",
        title: "Open File Sharing Control Panel",
        onClickFunc: fn()
      }, {
        id: "spacer"
      }, {
        id: "file-sharing-toggle",
        title: sharing ? "Turn File Sharing Off" : "Turn File Sharing On",
        onClickFunc: () => setSharing(s => !s)
      }]
    }, {
      id: "volume",
      label: "Volume",
      icon: ClassicyIcons.controlPanels.soundManager.sound66,
      content:
      // A vertical slider fills its container's height; the padding
      // holds the value readout under the track.
      <div style={{
        height: 110,
        paddingBottom: 20
      }}>
                        <ClassicySlider id="control-strip-volume" ariaLabel="Volume" orientation="vertical" value={volume} onChangeFunc={e => setVolume(Number(e.target.value))} />
                    </div>
    }, ...builtIns];
    return <ClassicyControlStrip modules={modules} />;
  }
}`,...f.parameters?.docs?.source},description:{story:`HIGOS8 Figure 6-15: a File Sharing module whose menu leads with an italic
status line and offers a command that opens its control panel, beside a
volume module that pops up a slider instead of a menu (Figure 2-16).`,...f.parameters?.docs?.description}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => {
    const builtIns = useClassicyDefaultControlStripModules();
    const extra = Array.from({
      length: 6
    }, (_, i) => ({
      ...builtIns[i % builtIns.length],
      id: \`module-\${i}\`
    }));
    return <ClassicyControlStrip modules={extra} defaultWidth={90} />;
  }
}`,...C.parameters?.docs?.source},description:{story:"Too narrow for its modules: the scroll arrows step through them.",...C.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    defaultCollapsed: true
  }
}`,...b.parameters?.docs?.source}}};const oe=["Default","CustomModules","Scrolling","Collapsed"];export{b as Collapsed,f as CustomModules,S as Default,C as Scrolling,oe as __namedExportsOrder,ne as default};
