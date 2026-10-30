import{am as a,j as t,i as u,an as g}from"./iframe-CDlBZayb.js";import"./preload-helper-PPVm8Dsz.js";const c=[{id:"finder",name:"Finder",kind:"Application",memoryKb:1024},{id:"simpletext",name:"SimpleText",kind:"Application",memoryKb:512},{id:"system",name:"Mac OS",kind:"System Software",memoryKb:8192},{id:"moviep",name:"Movie Player",kind:"Application",memoryKb:2048},{id:"hypercard",name:"HyperCard",kind:"Application",memoryKb:1536}],d=[{id:"name",title:"Name",accessor:e=>e.name,width:180},{id:"kind",title:"Kind",accessor:e=>e.kind},{id:"memory",title:"Memory",accessor:e=>e.memoryKb,render:e=>t.jsxs("span",{children:[e.memoryKb.toLocaleString()," K"]}),align:"right",width:90}],S={title:"Controls/Table",component:a,decorators:[e=>t.jsx("div",{style:{width:420,height:200},children:t.jsx(e,{})})]},o={args:{columns:d,rows:c,getRowId:e=>e.id,defaultSort:{columnId:"name"}}},n={args:{columns:d,rows:c,getRowId:e=>e.id,selectionMode:"multi"}},h=[{id:"system",name:"System Folder",size:"—",children:[{id:"system/fonts",name:"Fonts",size:"2.1 MB"},{id:"system/extensions",name:"Extensions",size:"—",children:[{id:"system/extensions/qt",name:"QuickTime",size:"1.4 MB"}]}]},{id:"readme",name:"Read Me",size:"8 K"}],y=()=>{const[e,l]=u.useState([]),m=[{id:"name",title:"Name",accessor:s=>s.name,width:240,render:(s,i)=>t.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,paddingLeft:`calc(var(--window-control-size) * ${i.depth})`},children:[t.jsx("span",{style:{display:"inline-block",width:12},onClick:p=>p.stopPropagation(),children:i.canExpand&&t.jsx(g,{direction:"right",open:i.isExpanded,onToggle:i.toggle})}),s.name]})},{id:"size",title:"Size",accessor:s=>s.size,align:"right"}];return t.jsx(a,{columns:m,rows:h,getRowId:s=>s.id,getSubRows:s=>s.children,selected:e,onSelectionChange:l})},r={render:()=>t.jsx(y,{})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    columns: columns as ClassicyTableColumn<unknown>[],
    rows: processes,
    getRowId: p => (p as Process).id,
    defaultSort: {
      columnId: "name"
    }
  }
}`,...o.parameters?.docs?.source},description:{story:`Sortable, resizable columns, sorted by Name on mount: click a header to
sort by it, click again to flip the direction, drag a header's right edge
to resize. The Memory column uses a custom \`render\` and right alignment.
Focus the list and type a name's first letters to jump to it.`,...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    columns: columns as ClassicyTableColumn<unknown>[],
    rows: processes,
    getRowId: p => (p as Process).id,
    selectionMode: "multi"
  }
}`,...n.parameters?.docs?.source},description:{story:`\`selectionMode="multi"\` follows the Mac conventions: a plain click
replaces the selection, ⌘/Ctrl-click toggles a row, Shift-click and
Shift-arrows extend a range over the current sorted order, and ⌘A selects
every row.`,...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <FolderTable />
}`,...r.parameters?.docs?.source},description:{story:"Tree rows, the way the Finder list view is built: `getSubRows` nests rows,\nand the first column's `render` draws its own indent and disclosure\ntriangle from the `{ depth, canExpand, isExpanded, toggle }` cell context.\nFocus a branch row and press ⌘→ / ⌘← to expand or collapse it. Selection\nhere is controlled (`selected` + `onSelectionChange`).",...r.parameters?.docs?.description}}};const x=["AboutThisComputer","MultiSelect","TreeRows"];export{o as AboutThisComputer,n as MultiSelect,r as TreeRows,x as __namedExportsOrder,S as default};
