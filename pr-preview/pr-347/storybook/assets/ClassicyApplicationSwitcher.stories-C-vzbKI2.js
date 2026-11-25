import{j as o,d as m,u,e as S,f as w,g}from"./iframe-Bzba_oS8.js";import{d,S as T}from"./helpers-CYJoDGsp.js";import"./preload-helper-CiDKIbga.js";const O={title:"Desktop/Application Switcher",parameters:{...d,docs:{...d.docs,description:{component:`The Application Switcher (Mac OS 8.5), which the desktop mounts: drag past
the bottom of the Application menu and let go to tear it off into this
palette; click a button to switch, Option-click to switch and hide the
application in front. The zoom box shows or hides the names, Option-click
on it switches the icon size, Option-Shift-click the orientation.
Control-\` switches to the next application, Control-Shift-\` to the
previous one.`}}}},f=["Notes","Calendar"],k=["Address Book","Calendar","Graphing Calculator","Mail","Notes","Scrapbook","Stickies"],i=({options:l,apps:h=f})=>{const c=u(),p=JSON.stringify(l??{});return m.useEffect(()=>{const e=window.setTimeout(()=>{c({type:S,showNames:!0,iconSize:"small",orientation:"vertical",...JSON.parse(p)}),c({type:w,position:[420,120]})},300);return()=>{window.clearTimeout(e),c({type:g})}},[c,p]),o.jsx(o.Fragment,{children:h.map(e=>o.jsx(T,{id:`storybook.${e.toLowerCase().replace(/\s+/g,"-")}.app`,name:e},e))})},t={render:()=>o.jsx(i,{})},s={render:()=>o.jsx(i,{options:{showNames:!1}})},r={render:()=>o.jsx(i,{options:{showNames:!1,iconSize:"large"}})},n={render:()=>o.jsx(i,{options:{iconSize:"large",orientation:"horizontal"}})},a={render:()=>o.jsx(i,{options:{iconSize:"large"},apps:k})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <Torn />
}`,...t.parameters?.docs?.source},description:{story:"The palette as it tears off: names and small icons, down a column.",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    showNames: false
  }} />
}`,...s.parameters?.docs?.source},description:{story:"The zoom box clicked: icons alone.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    showNames: false,
    iconSize: "large"
  }} />
}`,...r.parameters?.docs?.source},description:{story:"Option-click on the zoom box: large icons.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    iconSize: "large",
    orientation: "horizontal"
  }} />
}`,...n.parameters?.docs?.source},description:{story:"Option-Shift-click on the zoom box: across, the drag bar down the side.",...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    iconSize: "large"
  }} apps={MANY} />
}`,...a.parameters?.docs?.source},description:{story:`More applications than a short or narrow desktop holds in one line: the
palette wraps into another column (another row, across), by what the
desktop can hold. \`bin/check-app-switcher-palette.ts\` checks the count,
and that it settles, in a browser.`,...a.parameters?.docs?.description}}};const z=["Palette","IconsOnly","LargeIcons","Horizontal","ManyApplications"];export{n as Horizontal,s as IconsOnly,r as LargeIcons,a as ManyApplications,t as Palette,z as __namedExportsOrder,O as default};
