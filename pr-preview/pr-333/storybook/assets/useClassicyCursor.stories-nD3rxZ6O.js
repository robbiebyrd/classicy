import{N as c,j as e,b as s}from"./iframe-DrpY5CCs.js";import"./preload-helper-shce2T3m.js";const i=()=>{const r=c();return e.jsxs("div",{style:{display:"flex",gap:"1em"},children:[e.jsx(s,{onClickFunc:()=>r("watch"),children:"Watch"}),e.jsx(s,{onClickFunc:()=>r("hand"),children:"Hand"}),e.jsx(s,{onClickFunc:()=>r("resizeLr"),children:"Resize"}),e.jsx(s,{onClickFunc:()=>r(),children:"Reset"})]})},p={title:"System/Cursor",component:i,parameters:{docs:{description:{component:"`useClassicyCursor()` returns a stable `setCursor(name?)` that swaps the whole page's pointer (`document.body.style.cursor`) for one of the Mac OS 8 cursor roles registered with `registerClassicyCursors`; call it with no name to restore the default. The change is global, so reset it when the operation ends. `ClassicySplitView` uses it to hold the resize cursor during a divider drag."}}}},t={},u=["arrow","watch","hand","ibeam","crosshair","resizeLr","resizeUd","resizeNwse","resizeNesw","resizeU","resizeD","resizeL","resizeR"],o={render:function(){const a=c();return e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:"0.5em"},children:[u.map(n=>e.jsx(s,{onClickFunc:()=>a(n),children:n},n)),e.jsx(s,{isDefault:!0,onClickFunc:()=>a(),children:"Reset"})]})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source},description:{story:`Click a button to change the cursor everywhere on the page that does not
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
}`,...o.parameters?.docs?.source},description:{story:"Every cursor role, one button each, so the full set can be compared. Platinum\nregisters no cursor for `ibeam`, `crosshair`, `resizeNwse` or `resizeNesw`,\nso those buttons restore the default. Remember to Reset afterwards — the\ncursor stays until changed.",...o.parameters?.docs?.description}}};const h=["Default","AllCursors"];export{o as AllCursors,t as Default,h as __namedExportsOrder,p as default};
