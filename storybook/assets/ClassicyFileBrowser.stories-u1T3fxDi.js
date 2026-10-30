import{U as d,j as e,V as u,C as w}from"./iframe-BTrDkYWs.js";import{d as y,S as g}from"./helpers-COzDkqf6.js";import"./preload-helper-PPVm8Dsz.js";const{fn:a}=__STORYBOOK_MODULE_TEST__,S={title:"Desktop/FileBrowser",component:d,parameters:y},n=({display:t,variant:c=t,listViewOptions:l,iconViewOptions:p})=>{const m=u(`storybookFS-${t}`);return e.jsx(g,{id:"storybook.app",name:"Storybook",children:e.jsx(w,{id:`browser-${c}`,appId:"storybook.app",title:"Macintosh HD",initialSize:[480,320],initialPosition:[80,60],scrollable:!0,children:e.jsx(d,{fs:m,path:"Macintosh HD",appId:"storybook.app",display:t,listViewOptions:l,iconViewOptions:p,dirOnClickFunc:a(),fileOnClickFunc:a()})})})},s={render:()=>e.jsx(n,{display:"icons"})},r={render:()=>e.jsx(n,{display:"list"})},i={render:()=>e.jsx(n,{display:"list",variant:"list-options",listViewOptions:{useRelativeDate:!1,calculateFolderSizes:!1,iconSize:"small",columns:{modified:!0,created:!0,size:!0,kind:!0,label:!0,comments:!1,version:!1}}})},o={render:()=>e.jsx(n,{display:"icons",variant:"icons-sorted",iconViewOptions:{arrangement:"sorted",keepArrangedBy:"kind",iconSize:"medium"}})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="icons" />
}`,...s.parameters?.docs?.source},description:{story:"The icon view (the default `display`): draggable icons laid out on the\ntheme's grid. Double-clicking an icon calls `dirOnClickFunc` /\n`fileOnClickFunc` with its path — the browser itself never navigates.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="list" />
}`,...r.parameters?.docs?.source},description:{story:`The list view: sortable Name / Size / Kind columns, disclosure triangles
that expand folders in place, Shift / Command-click multi-selection and
keyboard navigation (arrows, Home / End, Return to open, type-to-select).`,...r.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="list" variant="list-options" listViewOptions={{
    useRelativeDate: false,
    calculateFolderSizes: false,
    iconSize: "small",
    columns: {
      modified: true,
      created: true,
      size: true,
      kind: true,
      label: true,
      comments: false,
      version: false
    }
  }} />
}`,...i.parameters?.docs?.source},description:{story:"`listViewOptions` (Finder's View Options): extra Date Modified, Date\nCreated and Label columns, absolute dates and small icons.",...i.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="icons" variant="icons-sorted" iconViewOptions={{
    arrangement: "sorted",
    keepArrangedBy: "kind",
    iconSize: "medium"
  }} />
}`,...o.parameters?.docs?.source},description:{story:'`iconViewOptions` with `arrangement: "sorted"` ("Keep arranged by"): icons\nare ordered by `keepArrangedBy` and locked in place, so they cannot be\ndragged. `"grid"` would snap drops to the grid instead.',...o.parameters?.docs?.description}}};const b=["IconView","ListView","ListViewWithOptions","IconViewKeptArranged"];export{s as IconView,o as IconViewKeptArranged,r as ListView,i as ListViewWithOptions,b as __namedExportsOrder,S as default};
