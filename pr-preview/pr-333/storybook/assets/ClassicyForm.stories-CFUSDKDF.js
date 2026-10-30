import{j as t,b9 as u,a3 as d,J as l,a5 as b,T as f}from"./iframe-DJ7JmzOQ.js";import"./preload-helper-shce2T3m.js";const n=({onSubmitFunc:e,layout:o="default",className:i,children:m,...y})=>{const p=c=>{c.preventDefault(),e?.(c)};return t.jsx("form",{...y,className:u("classicyForm",o==="dialog"?"classicyFormDialog":"",i),onSubmit:p,children:m})},r=({className:e,style:o,children:i})=>t.jsx("div",{className:u("classicyFormButtonRow",e),style:o,children:i});n.__docgenInfo={description:'The `<form>` equivalent: a real form element with Platinum dialog layout.\nDeliberately thin — it owns submit semantics and spacing only; controls\nstay controlled by the consumer. Make the confirming `ClassicyButton` the\ndefault button with `isDefault buttonType="submit"` so Enter both submits\nand reads as pressing it.\n\nSubmission never navigates: `preventDefault` runs before `onSubmitFunc`.\nRead the values from your own state rather than `FormData` — custom\ncontrols such as `ClassicyPopUpMenu` and `ClassicyListBox` carry no native\nform value. Other `<form>` attributes\n(`id`, `aria-*`, `noValidate`…) pass through. End a dialog with\n`ClassicyFormButtonRow` (Cancel, then the default button), and use\n`layout="dialog"` when the form fills a modal `ClassicyWindow`.\n\n```tsx\n<ClassicyForm layout="dialog" onSubmitFunc={save}>\n    <ClassicyInput id="name" labelTitle="Name:" />\n    <ClassicyFormButtonRow>\n        <ClassicyButton onClickFunc={close}>Cancel</ClassicyButton>\n        <ClassicyButton isDefault buttonType="submit">Save</ClassicyButton>\n    </ClassicyFormButtonRow>\n</ClassicyForm>\n```',methods:[],displayName:"ClassicyForm",props:{layout:{defaultValue:{value:'"default"',computed:!1},required:!1}}};r.__docgenInfo={description:`The HIG dialog button row: right-aligned, Cancel to the left of the
default (confirming) button, HIG button gap, set off from the controls
above by the group gap.`,methods:[],displayName:"ClassicyFormButtonRow",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class on the row."},style:{required:!1,tsType:{name:"CSSProperties"},description:""}}};const{fn:h}=__STORYBOOK_MODULE_TEST__,F={title:"Controls/Form",component:n,args:{onSubmitFunc:h()}},a={render:e=>t.jsx("div",{style:{width:340},children:t.jsxs(n,{layout:"dialog",onSubmitFunc:e.onSubmitFunc,children:[t.jsx(d,{id:"form-name",labelTitle:"Name:",placeholder:"Untitled"}),t.jsx(b,{id:"form-format",label:"Format:",labelPosition:"left",selected:"text",options:[{value:"text",label:"Plain Text"},{value:"md",label:"Markdown"}]}),t.jsx(f,{id:"form-backup",label:"Keep a backup copy"}),t.jsxs(r,{children:[t.jsx(l,{children:"Cancel"}),t.jsx(l,{isDefault:!0,buttonType:"submit",children:"Save"})]})]})})},s={render:e=>t.jsx("div",{style:{width:340},children:t.jsxs(n,{onSubmitFunc:e.onSubmitFunc,children:[t.jsx(d,{id:"form-search",labelTitle:"Find:",labelPosition:"left",placeholder:"Search for…"}),t.jsx(r,{children:t.jsx(l,{isDefault:!0,buttonType:"submit",children:"Find"})})]})})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:`A dialog-style settings form: HIG row spacing and a right-aligned button
row. Enter in the name field (or clicking Save) triggers the default submit
button; the submit is logged in the Actions panel and the page never
navigates.`,...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    width: 340
  }}>
            <ClassicyForm onSubmitFunc={args.onSubmitFunc}>
                <ClassicyInput id="form-search" labelTitle="Find:" labelPosition="left" placeholder="Search for…" />
                <ClassicyFormButtonRow>
                    <ClassicyButton isDefault buttonType="submit">
                        Find
                    </ClassicyButton>
                </ClassicyFormButtonRow>
            </ClassicyForm>
        </div>
}`,...s.parameters?.docs?.source},description:{story:"The `default` layout: rows stacked with the HIG item gap and no dialog edge\ninset, for a form embedded in a larger window.",...s.parameters?.docs?.description}}};const w=["DialogForm","DefaultLayout"];export{s as DefaultLayout,a as DialogForm,w as __namedExportsOrder,F as default};
