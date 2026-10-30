import{aQ as c,j as s,r as g,aR as h}from"./iframe-Cs6dL_Bl.js";import{a as y,C as w}from"./ClassicyAppearanceProbe-3qsJ-reB.js";import"./preload-helper-shce2T3m.js";const d=[{id:"finder",name:"Finder",kind:"Application",memoryKb:1024},{id:"simpletext",name:"SimpleText",kind:"Application",memoryKb:512},{id:"system",name:"Mac OS",kind:"System Software",memoryKb:8192},{id:"moviep",name:"Movie Player",kind:"Application",memoryKb:2048},{id:"hypercard",name:"HyperCard",kind:"Application",memoryKb:1536}],l=[{id:"name",title:"Name",accessor:e=>e.name,width:180},{id:"kind",title:"Kind",accessor:e=>e.kind},{id:"memory",title:"Memory",accessor:e=>e.memoryKb,render:e=>s.jsxs("span",{children:[e.memoryKb.toLocaleString()," K"]}),align:"right",width:90}],f={title:"Controls/Table",component:c,decorators:[e=>s.jsx("div",{style:{width:420,height:200},children:s.jsx(e,{})})]},o={args:{columns:l,rows:d,getRowId:e=>e.id,defaultSort:{columnId:"name"}}},n={args:{columns:l,rows:d,getRowId:e=>e.id,selectionMode:"multi"}},b=[{id:"system",name:"System Folder",size:"\u2014",children:[{id:"system/fonts",name:"Fonts",size:"2.1 MB"},{id:"system/extensions",name:"Extensions",size:"\u2014",children:[{id:"system/extensions/qt",name:"QuickTime",size:"1.4 MB"}]}]},{id:"readme",name:"Read Me",size:"8 K"}],S=()=>{const[e,m]=g.useState([]),p=[{id:"name",title:"Name",accessor:r=>r.name,width:240,render:(r,i)=>s.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,paddingLeft:`calc(var(--window-control-size) * ${i.depth})`},children:[s.jsx("span",{style:{display:"inline-block",width:12},onClick:u=>u.stopPropagation(),children:i.canExpand&&s.jsx(h,{direction:"right",open:i.isExpanded,onToggle:i.toggle})}),r.name]})},{id:"size",title:"Size",accessor:r=>r.size,align:"right"}];return s.jsx(c,{columns:p,rows:b,getRowId:r=>r.id,getSubRows:r=>r.children,selected:e,onSelectionChange:m})},t={render:()=>s.jsx(S,{})},a={args:o.args,render:e=>s.jsx(w,{children:s.jsx(c,{...e})}),parameters:y()};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
replaces the selection, \u2318/Ctrl-click toggles a row, Shift-click and
Shift-arrows extend a range over the current sorted order, and \u2318A selects
every row.`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <FolderTable />
}`,...t.parameters?.docs?.source},description:{story:"Tree rows, the way the Finder list view is built: `getSubRows` nests rows,\nand the first column's `render` draws its own indent and disclosure\ntriangle from the `{ depth, canExpand, isExpanded, toggle }` cell context.\nFocus a branch row and press \u2318\u2192 / \u2318\u2190 to expand or collapse it. Selection\nhere is controlled (`selected` + `onSelectionChange`).",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: AboutThisComputer.args,
  render: (args: ComponentProps<typeof ClassicyTable>) => <ClassicyAppearanceProbe>
            <ClassicyTable {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...a.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...a.parameters?.docs?.description}}};const T=["AboutThisComputer","MultiSelect","TreeRows","AppearanceHooks"];export{o as AboutThisComputer,a as AppearanceHooks,n as MultiSelect,t as TreeRows,T as __namedExportsOrder,f as default};
