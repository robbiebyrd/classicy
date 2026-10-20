import{J as c,j as e,b as s,m as i}from"./iframe-CjcNnztT.js";import"./preload-helper-PPVm8Dsz.js";const u=()=>{const r=c();return e.jsxs("div",{style:{display:"flex",gap:"1em"},children:[e.jsx(s,{onClickFunc:()=>r("watch"),children:"Watch"}),e.jsx(s,{onClickFunc:()=>r("hand"),children:"Hand"}),e.jsx(s,{onClickFunc:()=>r("eyedropper"),children:"Eyedropper"}),e.jsx(s,{onClickFunc:()=>r(),children:"Reset"})]})},m={title:"System/Cursor",component:u,parameters:{docs:{description:{component:"`useClassicyCursor()` returns a stable `setCursor(name?)` that swaps the whole page's pointer (`document.body.style.cursor`) for one of the Mac OS 8 cursors in `ClassicyIcons.ui.cursors`; call it with no name to restore the default. The change is global, so reset it when the operation ends. `ClassicySplitView` uses it to hold the resize cursor during a divider drag."}}}},t={},l=Object.keys(i.ui.cursors),o={render:function(){const a=c();return e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:"0.5em"},children:[l.map(n=>e.jsx(s,{onClickFunc:()=>a(n),children:n},n)),e.jsx(s,{isDefault:!0,onClickFunc:()=>a(),children:"Reset"})]})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source},description:{story:`Click a button to change the cursor everywhere on the page that does not
set its own CSS cursor, then Reset to restore the default arrow.`,...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: function AllCursorsRender() {
    const setCursor = useClassicyCursor();
    return <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "0.5em"
    }}>
                {cursorNames.map(name => <ClassicyButton key={name} onClickFunc={() => setCursor(name)}>
                        {name}
                    </ClassicyButton>)}
                <ClassicyButton isDefault onClickFunc={() => setCursor()}>
                    Reset
                </ClassicyButton>
            </div>;
  }
}`,...o.parameters?.docs?.source},description:{story:`Every bundled cursor name, one button each, so the full set can be
compared. Remember to Reset afterwards — the cursor stays until changed.`,...o.parameters?.docs?.description}}};const C=["Default","AllCursors"];export{o as AllCursors,t as Default,C as __namedExportsOrder,m as default};
