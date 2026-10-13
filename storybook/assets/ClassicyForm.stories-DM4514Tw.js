import{j as e,a9 as i,o as p,K as y,l as b,h as n}from"./iframe-B-BdjOrb.js";import"./preload-helper-PPVm8Dsz.js";const s=({onSubmitFunc:a,layout:o="default",className:c,children:m,...u})=>{const d=l=>{l.preventDefault(),a?.(l)};return e.jsx("form",{...u,className:i("classicyForm",o==="dialog"?"classicyFormDialog":"",c),onSubmit:d,children:m})},r=({className:a,children:o})=>e.jsx("div",{className:i("classicyFormButtonRow",a),children:o});s.__docgenInfo={description:'The `<form>` equivalent: a real form element with Platinum dialog layout.\nDeliberately thin — it owns submit semantics and spacing only; controls\nstay controlled by the consumer. Make the confirming `ClassicyButton` the\ndefault button with `isDefault buttonType="submit"` so Enter both submits\nand reads as pressing it.',methods:[],displayName:"ClassicyForm",props:{layout:{defaultValue:{value:'"default"',computed:!1},required:!1}}};r.__docgenInfo={description:`The HIG dialog button row: right-aligned, Cancel to the left of the
default (confirming) button, HIG button gap, set off from the controls
above by the group gap.`,methods:[],displayName:"ClassicyFormButtonRow",props:{className:{required:!1,tsType:{name:"string"},description:""}}};const C={title:"Controls/Form",component:s},t={render:()=>e.jsx("div",{style:{width:340},children:e.jsxs(s,{layout:"dialog",onSubmitFunc:()=>window.alert("Saved!"),children:[e.jsx(p,{id:"form-name",labelTitle:"Name:",placeholder:"Untitled"}),e.jsx(y,{id:"form-format",label:"Format:",labelPosition:"left",selected:"text",options:[{value:"text",label:"Plain Text"},{value:"md",label:"Markdown"}]}),e.jsx(b,{id:"form-backup",label:"Keep a backup copy"}),e.jsxs(r,{children:[e.jsx(n,{children:"Cancel"}),e.jsx(n,{isDefault:!0,buttonType:"submit",children:"Save"})]})]})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 340
  }}>
            <ClassicyForm layout="dialog" onSubmitFunc={() => window.alert("Saved!")}>
                <ClassicyInput id="form-name" labelTitle="Name:" placeholder="Untitled" />
                <ClassicyPopUpMenu id="form-format" label="Format:" labelPosition="left" selected="text" options={[{
        value: "text",
        label: "Plain Text"
      }, {
        value: "md",
        label: "Markdown"
      }]} />
                <ClassicyCheckbox id="form-backup" label="Keep a backup copy" />
                <ClassicyFormButtonRow>
                    <ClassicyButton>Cancel</ClassicyButton>
                    <ClassicyButton isDefault buttonType="submit">
                        Save
                    </ClassicyButton>
                </ClassicyFormButtonRow>
            </ClassicyForm>
        </div>
}`,...t.parameters?.docs?.source}}};const x=["DialogForm"];export{t as DialogForm,x as __namedExportsOrder,C as default};
