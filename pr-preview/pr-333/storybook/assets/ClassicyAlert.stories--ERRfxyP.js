import{v as a,j as o}from"./iframe-CQ2j-hJA.js";import{a as b,C as y}from"./ClassicyAppearanceProbe-B30Q6GBo.js";import{d as h,S as t}from"./helpers-B7P_fWi-.js";import{m as k}from"./mirrored-DxiMD8C2.js";import"./preload-helper-shce2T3m.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,A={title:"Dialogs/Alert",component:a,parameters:h},r={render:()=>o.jsx(m,{})};function m(){return o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-note",appId:"storybook.app",alertType:"note",label:"The document has been saved.",message:"Your changes to \u201CUntitled\u201D were written to disk successfully.",onClose:e()})})}const n={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution",appId:"storybook.app",alertType:"caution",label:"Are you sure you want to empty the Trash?",message:"It contains 3 items. This action cannot be undone.",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"ok",label:"Empty Trash",role:"default",onClick:e()}],onClose:e()})})},s={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-dataloss",appId:"storybook.app",alertType:"caution",label:"Discard unsaved changes?",message:"If you don\u2019t save, your changes will be lost.",defaultButtonId:"cancel",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"discard",label:"Discard",onClick:e()}],onClose:e()})})},l={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-stop",appId:"storybook.app",alertType:"stop",label:"The application \u201CSimple Text\u201D could not be opened.",message:"There is not enough memory available to open this application.",onClose:e()})})},i={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-help",appId:"storybook.app",alertType:"caution",label:"Save changes before closing?",message:"Your document contains unsaved changes.",buttons:[{id:"help",label:"?",role:"help",onClick:e()},{id:"dontsave",label:"Don\u2019t Save",onClick:e()},{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"save",label:"Save",role:"default",onClick:e()}],onClose:e()})})},p={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable",appId:"storybook.app",alertType:"caution",movable:!0,title:"Replace File",label:"A file named \u201CReport\u201D already exists.",message:"Do you want to replace it with the one you are moving?",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"replace",label:"Replace",role:"default",onClick:e()}],onClose:e()})})},c={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution-defaults",appId:"storybook.app",alertType:"caution",label:"The disk is almost full.",message:"Continuing may leave too little space to save your work.",onClose:e()})})},d={render:()=>o.jsx(y,{children:o.jsx(m,{})}),parameters:b("600px")},u={...n,parameters:k};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <NoteAlertStory />
}`,...r.parameters?.docs?.source},description:{story:"A `note` alert with no `buttons` prop: the note icon and the generated single\nOK button. Use a note to report something the user should know but need not\ndecide on.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-caution" appId="storybook.app" alertType="caution" label="Are you sure you want to empty the Trash?" message="It contains 3 items. This action cannot be undone." buttons={[{
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "ok",
      label: "Empty Trash",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...n.parameters?.docs?.source},description:{story:'A `caution` alert with explicit buttons: Cancel (`role: "cancel"`, fired by\nEscape / Command-period) and a specific verb as the default (fired by\nReturn). HIG: name the action ("Empty Trash"), not "OK".',...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-dataloss" appId="storybook.app" alertType="caution" label="Discard unsaved changes?" message="If you don\u2019t save, your changes will be lost." defaultButtonId="cancel" buttons={[{
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "discard",
      label: "Discard",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...s.parameters?.docs?.source},description:{story:"A caution that risks data loss: `defaultButtonId` makes the safe choice\n(Cancel) the default button, so a reflexive Return cannot destroy work\n(HIGOS8 p.60).",...s.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-stop" appId="storybook.app" alertType="stop" label="The application \u201CSimple Text\u201D could not be opened." message="There is not enough memory available to open this application." onClose={fn()} />
        </StoryApp>
}`,...l.parameters?.docs?.source},description:{story:"A `stop` alert: the stop icon and a single OK button, for a problem that\nprevented the action. Explain what happened and, where possible, what to do.",...l.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-help" appId="storybook.app" alertType="caution" label="Save changes before closing?" message="Your document contains unsaved changes." buttons={[{
      id: "help",
      label: "?",
      role: "help",
      onClick: fn()
    }, {
      id: "dontsave",
      label: "Don\u2019t Save",
      onClick: fn()
    }, {
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "save",
      label: "Save",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...i.parameters?.docs?.source},description:{story:'The four-button maximum: a `help`-role button (drawn as `ClassicyHelpButton`\nat the far left), an optional third action, Cancel and the default. A `"?"`\nlabel becomes the accessible name "Help".',...i.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-movable" appId="storybook.app" alertType="caution" movable={true} title="Replace File" label="A file named \u201CReport\u201D already exists." message="Do you want to replace it with the one you are moving?" buttons={[{
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "replace",
      label: "Replace",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...p.parameters?.docs?.source},description:{story:"The movable variant (`movable`): a draggable window whose title bar carries\nthe red highlight and shows `title`, instead of the fixed alert's red\ncontent border (HIGOS8 p.57). It plays the alert sound itself on open.",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-caution-defaults" appId="storybook.app" alertType="caution" label="The disk is almost full." message="Continuing may leave too little space to save your work." onClose={fn()} />
        </StoryApp>
}`,...c.parameters?.docs?.source},description:{story:"A `caution` alert with no `buttons` prop: the generated Cancel + Continue\npair, with Continue as the default. Pass `buttons` to name the action\ninstead, as the Caution story does.",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyAppearanceProbe>
            <NoteAlertStory />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters("600px")
}`,...d.parameters?.docs?.source},description:{story:`The Appearance Package hook surface, under the Storybook probe package:
every root \`decorate()\` reaches is outlined (green while pressed), and every
event the component emits is logged in the Actions panel.

It renders a fixed tree and takes no args.`,...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  ...Caution,
  parameters: mirroredParameters
}`,...u.parameters?.docs?.source},description:{story:"`Caution` under the Storybook-only `mirrored` Appearance Package: the icon\non the right of the message and the default button leftmost, by CSS alone\n(`flex-direction: row-reverse` on the top row and the button row). Return\nand Escape still pick the same buttons.",...u.parameters?.docs?.description}}};const T=["Note","Caution","CautionDataLoss","Stop","WithHelpButton","Movable","CautionDefaultButtons","AppearanceHooks","Mirrored"];export{d as AppearanceHooks,n as Caution,s as CautionDataLoss,c as CautionDefaultButtons,u as Mirrored,p as Movable,r as Note,l as Stop,i as WithHelpButton,T as __namedExportsOrder,A as default};
