import{x as a,i,j as e,y as d,C as p}from"./iframe-IeJ-rV85.js";import{d as u,S as m}from"./helpers-v2vhHR1H.js";import{C}from"./ClassicyOutput-DozxYM2J.js";import"./preload-helper-PPVm8Dsz.js";const f={title:"Controls/ColorPicker",component:a,parameters:u},t=({children:l})=>e.jsx(m,{id:"storybook.app",name:"Storybook",children:e.jsx(p,{id:"colors",appId:"storybook.app",title:"Colors",initialSize:[420,220],initialPosition:[80,60],children:e.jsx("div",{style:{padding:"1em"},children:l})})}),o={render:()=>e.jsx(t,{children:e.jsx(a,{id:"cp-default",defaultValue:12212012,labelTitle:"Highlight color:"})})},r={render:()=>{const[l,c]=i.useState(3368652);return e.jsxs(t,{children:[e.jsx(a,{id:"cp-controlled",labelTitle:"Accent color:",value:l,onChangeFunc:c}),e.jsx(C,{id:"cp-controlled-hex",label:"Value:",mono:!0,children:d(l)})]})}},n={render:()=>e.jsx(t,{children:e.jsx(a,{id:"cp-crayons",defaultValue:6724095,labelTitle:"Label color:",crayons:[{name:"Essential",color:16737792},{name:"Hot",color:14483456},{name:"In Progress",color:13369548},{name:"Cool",color:6724095},{name:"Personal",color:204},{name:"Project 1",color:39168},{name:"Project 2",color:6697728}]})})},s={render:()=>e.jsx(t,{children:e.jsx(a,{id:"cp-disabled",defaultValue:8947848,labelTitle:"Locked color:",disabled:!0})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <InWindow>
            <ClassicyColorPicker id="cp-default" defaultValue={0xba572c} labelTitle="Highlight color:" />
        </InWindow>
}`,...o.parameters?.docs?.source},description:{story:"An uncontrolled swatch seeded with `defaultValue`. Click it to open the Color\nPicker dialog; OK applies the new colour, Cancel discards it.",...o.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [color, setColor] = useState(0x3366cc);
    return <InWindow>
                <ClassicyColorPicker id="cp-controlled" labelTitle="Accent color:" value={color} onChangeFunc={setColor} />
                <ClassicyOutput id="cp-controlled-hex" label="Value:" mono>
                    {intToHex(color)}
                </ClassicyOutput>
            </InWindow>;
  }
}`,...r.parameters?.docs?.source},description:{story:"Controlled use: the story owns `value` and shows the confirmed colour as hex\nbeside the swatch, updated from `onChangeFunc` after OK.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <InWindow>
            <ClassicyColorPicker id="cp-crayons" defaultValue={0x6699ff} labelTitle="Label color:" crayons={[{
      name: "Essential",
      color: 0xff6600
    }, {
      name: "Hot",
      color: 0xdd0000
    }, {
      name: "In Progress",
      color: 0xcc00cc
    }, {
      name: "Cool",
      color: 0x6699ff
    }, {
      name: "Personal",
      color: 0x0000cc
    }, {
      name: "Project 1",
      color: 0x009900
    }, {
      name: "Project 2",
      color: 0x663300
    }]} />
        </InWindow>
}`,...n.parameters?.docs?.source},description:{story:"`crayons` replaces the Crayons panel's palette with your own named colours.",...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <InWindow>
            <ClassicyColorPicker id="cp-disabled" defaultValue={0x888888} labelTitle="Locked color:" disabled={true} />
        </InWindow>
}`,...s.parameters?.docs?.source},description:{story:"A disabled swatch: dimmed, and it does not open the dialog.",...s.parameters?.docs?.description}}};const w=["Default","Controlled","CustomCrayons","Disabled"];export{r as Controlled,n as CustomCrayons,o as Default,s as Disabled,w as __namedExportsOrder,f as default};
