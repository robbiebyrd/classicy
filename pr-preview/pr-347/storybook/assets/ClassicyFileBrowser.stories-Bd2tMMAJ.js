import{a6 as l,j as e,a7 as g,C as y}from"./iframe-BS4IKdgB.js";import{c as h,e as S,d as f,S as b}from"./helpers-C5L8HUTj.js";import"./preload-helper-CiDKIbga.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,V={title:"Desktop/FileBrowser",component:l,parameters:f},s=({display:c,variant:p=c,listViewOptions:m,iconViewOptions:u})=>{const w=g(`storybookFS-${c}`);return e.jsx(b,{id:"storybook.app",name:"Storybook",children:e.jsx(y,{id:`browser-${p}`,appId:"storybook.app",title:"Macintosh HD",initialSize:[480,320],initialPosition:[80,60],scrollable:!0,children:e.jsx(l,{fs:w,path:"Macintosh HD",appId:"storybook.app",display:c,listViewOptions:m,iconViewOptions:u,dirOnClickFunc:d(),fileOnClickFunc:d()})})})},r={render:()=>e.jsx(s,{display:"icons"})},i={render:()=>e.jsx(s,{display:"list"})},n={render:()=>e.jsx(s,{display:"list",variant:"list-options",listViewOptions:{useRelativeDate:!1,calculateFolderSizes:!1,iconSize:"small",columns:{modified:!0,created:!0,size:!0,kind:!0,label:!0,comments:!1,version:!1}}})},t={render:()=>e.jsx(s,{display:"icons",variant:"icons-sorted",iconViewOptions:{arrangement:"sorted",keepArrangedBy:"kind",iconSize:"medium"}})},o={render:()=>e.jsx(s,{display:"icons",variant:"icons-marquee"}),play:h},a={render:()=>e.jsx(s,{display:"icons",variant:"icons-marquee-edge"}),play:S};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="icons" />
}`,...r.parameters?.docs?.source},description:{story:"The icon view (the default `display`): draggable icons laid out on the\ntheme's grid. Double-clicking an icon calls `dirOnClickFunc` /\n`fileOnClickFunc` with its path \u2014 the browser itself never navigates.",...r.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="list" />
}`,...i.parameters?.docs?.source},description:{story:`The list view: sortable Name / Size / Kind columns, disclosure triangles
that expand folders in place, Shift / Command-click multi-selection and
keyboard navigation (arrows, Home / End, Return to open, type-to-select).`,...i.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"`listViewOptions` (Finder's View Options): extra Date Modified, Date\nCreated and Label columns, absolute dates and small icons.",...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="icons" variant="icons-sorted" iconViewOptions={{
    arrangement: "sorted",
    keepArrangedBy: "kind",
    iconSize: "medium"
  }} />
}`,...t.parameters?.docs?.source},description:{story:'`iconViewOptions` with `arrangement: "sorted"` ("Keep arranged by"): icons\nare ordered by `keepArrangedBy` and locked in place, so they cannot be\ndragged. `"grid"` would snap drops to the grid instead.',...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="icons" variant="icons-marquee" />,
  play: dragClassicySelectionRectangle
}`,...o.parameters?.docs?.source},description:{story:`The selection rectangle (story 0228-e9l): a drag from the empty space
above the first icon to the middle of the second, the button still held.
Platinum draws Mac OS 8.1's: a two-pixel frame of the 50% checker in XOR,
black over the white window, inverted over the icons it crosses; both
icons it touches are selected.`,...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <BrowserWindow display="icons" variant="icons-marquee-edge" />,
  play: dragClassicySelectionRectanglePastEdge
}`,...a.parameters?.docs?.source},description:{story:`The selection rectangle held past the window's bottom edge (story
0228-e9l): the window's contents clip it, so its sides run to the edge and
no line is drawn along it, as the Mac OS 8.1 Finder clipped its frame.`,...a.parameters?.docs?.description}}};const x=["IconView","ListView","ListViewWithOptions","IconViewKeptArranged","IconViewSelectionRectangle","IconViewSelectionRectanglePastEdge"];export{r as IconView,t as IconViewKeptArranged,o as IconViewSelectionRectangle,a as IconViewSelectionRectanglePastEdge,i as ListView,n as ListViewWithOptions,x as __namedExportsOrder,V as default};
