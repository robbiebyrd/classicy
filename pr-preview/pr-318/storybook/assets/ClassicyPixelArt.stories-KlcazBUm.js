import{a1 as p,a2 as c,j as e,a3 as b,a4 as K,a5 as m,a6 as y,a7 as h,a8 as g,a9 as S,aa as x}from"./iframe-DvutPN8R.js";import"./preload-helper-Ce0tdlyH.js";const w={title:"System/PixelArt",component:c},l=({by:r,children:a})=>e.jsx("div",{style:{zoom:r,lineHeight:0},children:a}),d=({label:r,children:a})=>e.jsxs("figure",{style:{margin:0,textAlign:"center"},children:[a,e.jsx("figcaption",{style:{marginTop:6},children:r})]}),s={args:{rows:p}},t={args:{rows:p},decorators:[r=>e.jsx(l,{by:8,children:e.jsx(r,{})})]},u=[["Collapse box",b],["Scroll left",K],["Scroll left (disabled)",m],["Scroll right",y],["Scroll right (disabled)",h],["Module pop-up arrow",g],["Tab",p]],o={render:()=>e.jsx("div",{style:{display:"flex",gap:24,alignItems:"flex-end"},children:u.map(([r,a])=>e.jsx(d,{label:r,children:e.jsx(l,{by:4,children:e.jsx(c,{rows:a})})},r))})},n={render:()=>e.jsxs("div",{style:{display:"flex",gap:24,alignItems:"flex-start"},children:[e.jsx(d,{label:"Track",children:e.jsx(l,{by:3,children:e.jsx(c,{rows:S})})}),e.jsx(d,{label:"Thumb",children:e.jsx(l,{by:3,children:e.jsx(c,{rows:x})})})]})},i={args:{rows:[".KKKKKKKKKK.","KWWWWWWWWW5K","KW333333335K","KW3bbbbbb35K","KW3bccccb35K","KW3bcddcb35K","KW3bcddcb35K","KW3bccccb35K","KW3bbbbbb35K","KW333333335K","K5555555555K",".KKKKKKKKKK."]},decorators:[r=>e.jsx(l,{by:8,children:e.jsx(r,{})})]};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    rows: controlStripTab
  }
}`,...s.parameters?.docs?.source},description:{story:`The Control Strip's tab (HIGOS8 Figure 6-15, 17 × 24) at its native size —
exactly as the strip draws it. Switch the toolbar theme to watch the
greys follow the palette.`,...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    rows: controlStripTab
  },
  decorators: [Story => <Magnify by={8}>
                <Story />
            </Magnify>]
}`,...t.parameters?.docs?.source},description:{story:"The same tab magnified 8×, so the individual palette-token pixels show.",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: 24,
    alignItems: "flex-end"
  }}>
            {controlStripArt.map(([label, rows]) => <Labelled key={label} label={label}>
                    <Magnify by={4}>
                        <ClassicyPixelArt rows={rows} />
                    </Magnify>
                </Labelled>)}
        </div>
}`,...o.parameters?.docs?.source},description:{story:"Every Control Strip glyph from `ClassicyControlStripArt`, magnified 4×.\nThe arrows and tab are drawn in black and the system greys; the collapse\nbox also carries a theme accent token (`b`), so it picks up the theme's\naccent colour.",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: 24,
    alignItems: "flex-start"
  }}>
            <Labelled label="Track">
                <Magnify by={3}>
                    <ClassicyPixelArt rows={popUpSliderTrack} />
                </Magnify>
            </Labelled>
            <Labelled label="Thumb">
                <Magnify by={3}>
                    <ClassicyPixelArt rows={popUpSliderThumb} />
                </Magnify>
            </Labelled>
        </div>
}`,...n.parameters?.docs?.source},description:{story:"The pop-up volume slider's track (10 × 68) and thumb (15 × 10) from\nHIGOS8 Figure 2-16, as `ClassicyPopUpSlider` layers them, magnified 3×.",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    rows: [".KKKKKKKKKK.", "KWWWWWWWWW5K", "KW333333335K", "KW3bbbbbb35K", "KW3bccccb35K", "KW3bcddcb35K", "KW3bcddcb35K", "KW3bccccb35K", "KW3bbbbbb35K", "KW333333335K", "K5555555555K", ".KKKKKKKKKK."]
  },
  decorators: [Story => <Magnify by={8}>
                <Story />
            </Magnify>]
}`,...i.parameters?.docs?.source},description:{story:"Hand-authored art: a beveled square with a black frame, white and\nsystem-05 bevel, system-03 face and a centre in the theme accents `b`, `c`\nand `d`. Every character is a palette token and `.` is transparent; edit\nthe `rows` control to draw your own.",...i.parameters?.docs?.description}}};const j=["NativeSize","Magnified","ControlStripGlyphs","PopUpSliderArt","CustomArt"];export{o as ControlStripGlyphs,i as CustomArt,t as Magnified,s as NativeSize,n as PopUpSliderArt,j as __namedExportsOrder,w as default};
