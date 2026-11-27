import{j as o,m as n,h as m,s as y}from"./iframe-C5PysMpf.js";import{C as t,a as e}from"./ClassicyButtonToolbar-DPhXo8Qc.js";import"./preload-helper-DhQH6ajB.js";const h={title:"Controls/ButtonToolbar",component:t},s=()=>y("icons","system.info")??"",i={render:()=>o.jsx(t,{children:o.jsxs(e,{children:[o.jsx(n,{icon:s(),iconAlt:"Back"}),o.jsx(n,{icon:s(),iconAlt:"Forward"}),o.jsx(n,{icon:s(),iconAlt:"Stop"})]})})},r={render:()=>o.jsxs(t,{children:[o.jsxs(e,{children:[o.jsx(n,{icon:s(),iconAlt:"Back"}),o.jsx(n,{icon:s(),iconAlt:"Forward"})]}),o.jsxs(e,{children:[o.jsx(n,{icon:s(),iconAlt:"Zoom in"}),o.jsx(n,{icon:s(),iconAlt:"Zoom out"})]}),o.jsx(e,{children:o.jsx(n,{icon:s(),iconAlt:"Settings"})})]})},c={render:()=>o.jsxs(t,{children:[o.jsxs(e,{children:[o.jsx(n,{icon:s(),iconAlt:"New"}),o.jsx(n,{icon:s(),iconAlt:"Open"})]}),o.jsxs(e,{children:[o.jsx(n,{children:"Subscribe"}),o.jsx(n,{children:"Unsubscribe"})]})]})},b=["Left","Center","Right"],a={render:function(){const[p,B]=m.useState("Left");return o.jsxs(t,{children:[o.jsxs(e,{children:[o.jsx(n,{mode:"toggle",icon:s(),iconAlt:"Bold"}),o.jsx(n,{mode:"toggle",icon:s(),iconAlt:"Italic"})]}),o.jsx(e,{children:b.map(u=>o.jsx(n,{mode:"radio",icon:s(),iconAlt:u,on:p===u,onChangeFunc:()=>B(u)},u))})]})}},l={render:()=>o.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:["large","medium","small"].map(d=>o.jsxs(t,{size:d,children:[o.jsxs(e,{children:[o.jsx(n,{icon:s(),iconAlt:"Back"}),o.jsx(n,{icon:s(),iconAlt:"Forward"})]}),o.jsx(e,{children:o.jsx(n,{children:"Subscribe"})})]},d))})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Back" />
                <ClassicyBevelButton icon={icon()} iconAlt="Forward" />
                <ClassicyBevelButton icon={icon()} iconAlt="Stop" />
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...i.parameters?.docs?.source},description:{story:`One group of icon-only bevel buttons: squared by the toolbar, packed flush,
and no divider, since dividers only go between groups.`,...i.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Back" />
                <ClassicyBevelButton icon={icon()} iconAlt="Forward" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Zoom in" />
                <ClassicyBevelButton icon={icon()} iconAlt="Zoom out" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Settings" />
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...r.parameters?.docs?.source},description:{story:`Three groups with dividers drawn automatically between them. Tab into the
toolbar once, then use the arrow keys (wrapping) and Home/End to move
between buttons across groups.`,...r.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="New" />
                <ClassicyBevelButton icon={icon()} iconAlt="Open" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton>Subscribe</ClassicyBevelButton>
                <ClassicyBevelButton>Unsubscribe</ClassicyBevelButton>
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...c.parameters?.docs?.source},description:{story:`Icon-only buttons go square inside a toolbar; buttons with a text label keep
their rectangular shape.`,...c.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [alignment, setAlignment] = useState<(typeof alignments)[number]>("Left");
    return <ClassicyButtonToolbar>
                <ClassicyButtonToolbarGroup>
                    <ClassicyBevelButton mode="toggle" icon={icon()} iconAlt="Bold" />
                    <ClassicyBevelButton mode="toggle" icon={icon()} iconAlt="Italic" />
                </ClassicyButtonToolbarGroup>
                <ClassicyButtonToolbarGroup>
                    {alignments.map(label => <ClassicyBevelButton key={label} mode="radio" icon={icon()} iconAlt={label} on={alignment === label} onChangeFunc={() => setAlignment(label)} />)}
                </ClassicyButtonToolbarGroup>
            </ClassicyButtonToolbar>;
  }
}`,...a.parameters?.docs?.source},description:{story:'A toggle group (Bold/Italic) beside a radio group (alignment). A\n`mode="radio"` bevel button only ever turns itself on \u2014 it knows nothing of\nits siblings \u2014 so the group is driven by one shared state value wired to\neach button\'s `on`/`onChangeFunc`, just as an HTML radio group needs a\nshared `name`.',...a.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
            {(["large", "medium", "small"] as const).map(size => <ClassicyButtonToolbar key={size} size={size}>
                    <ClassicyButtonToolbarGroup>
                        <ClassicyBevelButton icon={icon()} iconAlt="Back" />
                        <ClassicyBevelButton icon={icon()} iconAlt="Forward" />
                    </ClassicyButtonToolbarGroup>
                    <ClassicyButtonToolbarGroup>
                        <ClassicyBevelButton>Subscribe</ClassicyBevelButton>
                    </ClassicyButtonToolbarGroup>
                </ClassicyButtonToolbar>)}
        </div>
}`,...l.parameters?.docs?.source},description:{story:"All three `size`s stacked for comparison. `large` is the default; `medium`\nand `small` scale every control in the toolbar as a unit.",...l.parameters?.docs?.description}}};const A=["SingleGroup","MultipleGroups","MixedIconAndText","ToggleAndRadioGroups","Sizes"];export{c as MixedIconAndText,r as MultipleGroups,i as SingleGroup,l as Sizes,a as ToggleAndRadioGroups,A as __namedExportsOrder,h as default};
