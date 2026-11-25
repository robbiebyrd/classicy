import{a9 as o,j as e,E as i,aa as l,b as s,H as r,n as c}from"./iframe-D1zPQr4o.js";import"./preload-helper-CiDKIbga.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,p={title:"Controls/Form",component:o,args:{onSubmitFunc:d()}},t={render:n=>e.jsx("div",{style:{width:340},children:e.jsxs(o,{layout:"dialog",onSubmitFunc:n.onSubmitFunc,children:[e.jsx(i,{id:"form-name",labelTitle:"Name:",placeholder:"Untitled"}),e.jsx(r,{id:"form-format",label:"Format:",labelPosition:"left",selected:"text",options:[{value:"text",label:"Plain Text"},{value:"md",label:"Markdown"}]}),e.jsx(c,{id:"form-backup",label:"Keep a backup copy"}),e.jsxs(l,{children:[e.jsx(s,{children:"Cancel"}),e.jsx(s,{isDefault:!0,buttonType:"submit",children:"Save"})]})]})})},a={render:n=>e.jsx("div",{style:{width:340},children:e.jsxs(o,{onSubmitFunc:n.onSubmitFunc,children:[e.jsx(i,{id:"form-search",labelTitle:"Find:",labelPosition:"left",placeholder:"Search for\u2026"}),e.jsx(l,{children:e.jsx(s,{isDefault:!0,buttonType:"submit",children:"Find"})})]})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
}`,...t.parameters?.docs?.source},description:{story:`A dialog-style settings form: HIG row spacing and a right-aligned button
row. Enter in the name field (or clicking Save) triggers the default submit
button; the submit is logged in the Actions panel and the page never
navigates.`,...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:"The `default` layout: rows stacked with the HIG item gap and no dialog edge\ninset, for a form embedded in a larger window.",...a.parameters?.docs?.description}}};const b=["DialogForm","DefaultLayout"];export{a as DefaultLayout,t as DialogForm,b as __namedExportsOrder,p as default};
