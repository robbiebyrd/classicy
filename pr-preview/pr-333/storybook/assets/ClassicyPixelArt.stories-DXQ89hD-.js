import{aC as c,j as e}from"./iframe-BXxk5RQO.js";import"./preload-helper-shce2T3m.js";const m={title:"System/PixelArt",component:c},l=({by:r,children:t})=>e.jsx("div",{style:{zoom:r,lineHeight:0},children:t}),d=({label:r,children:t})=>e.jsxs("figure",{style:{margin:0,textAlign:"center"},children:[t,e.jsx("figcaption",{style:{marginTop:6},children:r})]}),a={args:{art:"controlStripTab"}},s={args:{art:"controlStripTab"},decorators:[r=>e.jsx(l,{by:8,children:e.jsx(r,{})})]},p=[["Collapse box","controlStripCollapse"],["Scroll left","controlStripScrollLeft"],["Scroll left (disabled)","controlStripScrollLeftDisabled"],["Scroll right","controlStripScrollRight"],["Scroll right (disabled)","controlStripScrollRightDisabled"],["Module pop-up arrow","controlStripModuleArrow"],["Tab","controlStripTab"]],o={render:()=>e.jsx("div",{style:{display:"flex",gap:24,alignItems:"flex-end"},children:p.map(([r,t])=>e.jsx(d,{label:r,children:e.jsx(l,{by:4,children:e.jsx(c,{art:t})})},r))})},n={render:()=>e.jsxs("div",{style:{display:"flex",gap:24,alignItems:"flex-start"},children:[e.jsx(d,{label:"Track",children:e.jsx(l,{by:3,children:e.jsx(c,{art:"popUpSliderTrack"})})}),e.jsx(d,{label:"Thumb",children:e.jsx(l,{by:3,children:e.jsx(c,{art:"popUpSliderThumb"})})})]})},i={args:{rows:[".KKKKKKKKKK.","KWWWWWWWWW5K","KW333333335K","KW3bbbbbb35K","KW3bccccb35K","KW3bcddcb35K","KW3bcddcb35K","KW3bccccb35K","KW3bbbbbb35K","KW333333335K","K5555555555K",".KKKKKKKKKK."]},decorators:[r=>e.jsx(l,{by:8,children:e.jsx(r,{})})]};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    art: "controlStripTab"
  }
}`,...a.parameters?.docs?.source},description:{story:"The Control Strip's tab (HIGOS8 Figure 6-15, 17 \xD7 24) at its native size \u2014\nexactly as the strip draws it, from the system-art key `controlStripTab`.\nSwitch the toolbar theme to watch the grays follow the palette.",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    art: "controlStripTab"
  },
  decorators: [Story => <Magnify by={8}>
                <Story />
            </Magnify>]
}`,...s.parameters?.docs?.source},description:{story:"The same tab magnified 8\xD7, so the individual palette-token pixels show.",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: 24,
    alignItems: "flex-end"
  }}>
            {controlStripArt.map(([label, art]) => <Labelled key={label} label={label}>
                    <Magnify by={4}>
                        <ClassicyPixelArt art={art} />
                    </Magnify>
                </Labelled>)}
        </div>
}`,...o.parameters?.docs?.source},description:{story:`Every Control Strip glyph the Appearance Package registers, by system-art
key, magnified 4\xD7.
The arrows and tab are drawn in black and the system grays; the collapse
box also carries a theme accent token (\`b\`), so it picks up the theme's
accent color.`,...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: 24,
    alignItems: "flex-start"
  }}>
            <Labelled label="Track">
                <Magnify by={3}>
                    <ClassicyPixelArt art="popUpSliderTrack" />
                </Magnify>
            </Labelled>
            <Labelled label="Thumb">
                <Magnify by={3}>
                    <ClassicyPixelArt art="popUpSliderThumb" />
                </Magnify>
            </Labelled>
        </div>
}`,...n.parameters?.docs?.source},description:{story:"The pop-up volume slider's track (10 \xD7 68) and thumb (15 \xD7 10) from\nHIGOS8 Figure 2-16, as `ClassicyPopUpSlider` layers them, magnified 3\xD7.",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    rows: [".KKKKKKKKKK.", "KWWWWWWWWW5K", "KW333333335K", "KW3bbbbbb35K", "KW3bccccb35K", "KW3bcddcb35K", "KW3bcddcb35K", "KW3bccccb35K", "KW3bbbbbb35K", "KW333333335K", "K5555555555K", ".KKKKKKKKKK."]
  },
  decorators: [Story => <Magnify by={8}>
                <Story />
            </Magnify>]
}`,...i.parameters?.docs?.source},description:{story:"Hand-authored art: a beveled square with a black frame, white and\nsystem-05 bevel, system-03 face and a center in the theme accents `b`, `c`\nand `d`. Every character is a palette token and `.` is transparent; edit\nthe `rows` control to draw your own.",...i.parameters?.docs?.description}}};const y=["NativeSize","Magnified","ControlStripGlyphs","PopUpSliderArt","CustomArt"];export{o as ControlStripGlyphs,i as CustomArt,s as Magnified,a as NativeSize,n as PopUpSliderArt,y as __namedExportsOrder,m as default};
