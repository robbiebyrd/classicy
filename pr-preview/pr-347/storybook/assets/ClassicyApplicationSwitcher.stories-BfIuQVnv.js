import{j as e,d as S,e as g,f,u as T,g as y,h as A,i as k}from"./iframe-BUsjYt92.js";import{d as h,S as x}from"./helpers-B6MSJ6x4.js";import"./preload-helper-CiDKIbga.js";const P={title:"Desktop/Application Switcher",parameters:{...h,docs:{...h.docs,description:{component:`The Application Switcher (Mac OS 8.5), which the desktop mounts: drag past
the bottom of the Application menu and let go to tear it off into this
palette; click a button to switch, Option-click to switch and hide the
application in front. The zoom box shows or hides the names, Option-click
on it switches the icon size, Option-Shift-click the orientation.
Control-\` switches to the next application, Control-Shift-\` to the
previous one.`}}}},O=["Notes","Calendar"],m=["Address Book","Calendar","Graphing Calculator","Mail","Notes","Scrapbook","Stickies"],t=({options:u,apps:w=O,restores:d=!1})=>{const p=T(),l=JSON.stringify(u??{});return S.useEffect(()=>{if(d&&g.getState().System.Manager.Applications.apps[f]?.data?.paletteOpen===!0)return;const o=window.setTimeout(()=>{p({type:y,showNames:!0,iconSize:"small",orientation:"vertical",...JSON.parse(l)}),p({type:A,position:[420,120]})},300);return()=>{window.clearTimeout(o),p({type:k})}},[p,l,d]),e.jsx(e.Fragment,{children:w.map(o=>e.jsx(x,{id:`storybook.${o.toLowerCase().replace(/\s+/g,"-")}.app`,name:o},o))})},s={render:()=>e.jsx(t,{})},r={render:()=>e.jsx(t,{options:{showNames:!1}})},a={render:()=>e.jsx(t,{options:{showNames:!1,iconSize:"large"}})},n={render:()=>e.jsx(t,{options:{iconSize:"large",orientation:"horizontal"}})},i={render:()=>e.jsx(t,{options:{iconSize:"large"},apps:m})},c={parameters:{classicy:{desktop:!0,persistence:!0}},render:()=>e.jsx(t,{options:{iconSize:"large"},apps:m,restores:!0})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <Torn />
}`,...s.parameters?.docs?.source},description:{story:"The palette as it tears off: names and small icons, down a column.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    showNames: false
  }} />
}`,...r.parameters?.docs?.source},description:{story:"The zoom box clicked: icons alone.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    showNames: false,
    iconSize: "large"
  }} />
}`,...a.parameters?.docs?.source},description:{story:"Option-click on the zoom box: large icons.",...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    iconSize: "large",
    orientation: "horizontal"
  }} />
}`,...n.parameters?.docs?.source},description:{story:"Option-Shift-click on the zoom box: across, the drag bar down the side.",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <Torn options={{
    iconSize: "large"
  }} apps={MANY} />
}`,...i.parameters?.docs?.source},description:{story:`More applications than a short or narrow desktop holds in one line: the
palette wraps into another column (another row, across), by what the
desktop can hold. \`bin/check-app-switcher-palette.ts\` checks the count,
and that it settles, in a browser.`,...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  parameters: {
    classicy: {
      desktop: true,
      persistence: true
    }
  },
  render: () => <Torn options={{
    iconSize: "large"
  }} apps={MANY} restores />
}`,...c.parameters?.docs?.source},description:{story:"`ManyApplications` on a page that keeps its desktop state across a reload,\nas a host's page does (`parameters.classicy.persistence`): the palette is\ntorn off on the first visit only, and after a reload it is drawn from its\nsaved window record, where it was left. That record exists a render before\nthe desktop's floating layer draws the palette's list, which is what the\ncount waits for (integration review G round 2, F1).\n`bin/check-app-switcher-palette.ts` reloads it twice.",...c.parameters?.docs?.description}}};const C=["Palette","IconsOnly","LargeIcons","Horizontal","ManyApplications","Persisted"];export{n as Horizontal,r as IconsOnly,a as LargeIcons,i as ManyApplications,s as Palette,c as Persisted,C as __namedExportsOrder,P as default};
