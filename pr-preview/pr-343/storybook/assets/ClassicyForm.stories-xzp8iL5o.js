import{h as f,bs as h,j as e,ba as d,x as m,b as l,z as C,i as g}from"./iframe-BDOzhcT_.js";import"./preload-helper-CxPGPiBr.js";const o=({onSubmitFunc:t,layout:n="default",className:i,children:y,...p})=>{const c=f.useRef(null);h(n==="dialog",c);const b=u=>{u.preventDefault(),t?.(u)};return e.jsx("form",{...p,ref:c,className:d("classicyForm",n==="dialog"?"classicyFormDialog":"",i),onSubmit:b,children:y})},r=({className:t,style:n,children:i})=>e.jsx("div",{className:d("classicyFormButtonRow",t),style:n,children:i});o.__docgenInfo={description:'The `<form>` equivalent: a real form element with Platinum dialog layout.\nDeliberately thin \u2014 it owns submit semantics and spacing only; controls\nstay controlled by the consumer. Make the confirming `ClassicyButton` the\ndefault button with `isDefault buttonType="submit"` so Enter both submits\nand reads as pressing it.\n\nSubmission never navigates: `preventDefault` runs before `onSubmitFunc`.\nRead the values from your own state rather than `FormData` \u2014 custom\ncontrols such as `ClassicyPopUpMenu` and `ClassicyListBox` carry no native\nform value. Other `<form>` attributes\n(`id`, `aria-*`, `noValidate`\u2026) pass through. End a dialog with\n`ClassicyFormButtonRow` (Cancel, then the default button), and use\n`layout="dialog"` when the form fills a modal `ClassicyWindow`.\n\n```tsx\n<ClassicyForm layout="dialog" onSubmitFunc={save}>\n    <ClassicyInput id="name" labelTitle="Name:" />\n    <ClassicyFormButtonRow>\n        <ClassicyButton onClickFunc={close}>Cancel</ClassicyButton>\n        <ClassicyButton isDefault buttonType="submit">Save</ClassicyButton>\n    </ClassicyFormButtonRow>\n</ClassicyForm>\n```',methods:[],displayName:"ClassicyForm",props:{layout:{defaultValue:{value:'"default"',computed:!1},required:!1}}};r.__docgenInfo={description:`The HIG dialog button row: right-aligned, Cancel to the left of the
default (confirming) button, HIG button gap, set off from the controls
above by the group gap.`,methods:[],displayName:"ClassicyFormButtonRow",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class on the row."},style:{required:!1,tsType:{name:"CSSProperties"},description:""}}};const{fn:F}=__STORYBOOK_MODULE_TEST__,v={title:"Controls/Form",component:o,args:{onSubmitFunc:F()}},s={render:t=>e.jsx("div",{style:{width:340},children:e.jsxs(o,{layout:"dialog",onSubmitFunc:t.onSubmitFunc,children:[e.jsx(m,{id:"form-name",labelTitle:"Name:",placeholder:"Untitled"}),e.jsx(C,{id:"form-format",label:"Format:",labelPosition:"left",selected:"text",options:[{value:"text",label:"Plain Text"},{value:"md",label:"Markdown"}]}),e.jsx(g,{id:"form-backup",label:"Keep a backup copy"}),e.jsxs(r,{children:[e.jsx(l,{children:"Cancel"}),e.jsx(l,{isDefault:!0,buttonType:"submit",children:"Save"})]})]})})},a={render:t=>e.jsx("div",{style:{width:340},children:e.jsxs(o,{onSubmitFunc:t.onSubmitFunc,children:[e.jsx(m,{id:"form-search",labelTitle:"Find:",labelPosition:"left",placeholder:"Search for\u2026"}),e.jsx(r,{children:e.jsx(l,{isDefault:!0,buttonType:"submit",children:"Find"})})]})})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    width: 340
  }}>
            <ClassicyForm layout="dialog" onSubmitFunc={args.onSubmitFunc}>
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
}`,...s.parameters?.docs?.source},description:{story:`A dialog-style settings form: HIG row spacing and a right-aligned button
row. Enter in the name field (or clicking Save) triggers the default submit
button; the submit is logged in the Actions panel and the page never
navigates.`,...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    width: 340
  }}>
            <ClassicyForm onSubmitFunc={args.onSubmitFunc}>
                <ClassicyInput id="form-search" labelTitle="Find:" labelPosition="left" placeholder="Search for\u2026" />
                <ClassicyFormButtonRow>
                    <ClassicyButton isDefault buttonType="submit">
                        Find
                    </ClassicyButton>
                </ClassicyFormButtonRow>
            </ClassicyForm>
        </div>
}`,...a.parameters?.docs?.source},description:{story:"The `default` layout: rows stacked with the HIG item gap and no dialog edge\ninset, for a form embedded in a larger window.",...a.parameters?.docs?.description}}};const S=["DialogForm","DefaultLayout"];export{a as DefaultLayout,s as DialogForm,S as __namedExportsOrder,v as default};
