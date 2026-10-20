import{j as s,aB as g,E as j,aC as D,aD as q}from"./iframe-DveWhMth.js";import"./preload-helper-D2v0tS7M.js";const v=(e,a,t)=>a!==void 0&&e<a?0:t!==void 0&&e>t?2:1,C=(e,{low:a,high:t,optimum:u}={})=>{const d=v(e,a,t),p=u!==void 0?v(u,a,t):1,r=Math.abs(d-p);return r===0?"optimal":r===1?"suboptimal":"bad"},L={optimal:"classicyMeterOptimal",suboptimal:"classicyMeterSuboptimal",bad:"classicyMeterBad"},M=({value:e,min:a=0,max:t=100,low:u,high:d,optimum:p,label:r,labelPosition:x="above",labelAlign:V="left",showValue:T,segments:m})=>{const y=t-a,b=y>0?Math.min(1,Math.max(0,(e-a)/y)):0,B=C(e,{low:u,high:d,optimum:p}),f=s.jsx("div",{className:g("classicyMeter",L[B],m?"classicyMeterSegmented":""),role:"meter","aria-valuenow":e,"aria-valuemin":a,"aria-valuemax":t,"aria-label":r,children:m?Array.from({length:m},(N,w)=>s.jsx("div",{className:g("classicyMeterSegment",w<Math.round(b*m)?"classicyMeterSegmentOn":"")},w)):s.jsx("div",{className:"classicyMeterFill",style:{width:`${b*100}%`}})});let h=f;return T&&(h=s.jsxs("div",{className:"classicyMeterRow",children:[f,s.jsx("span",{className:"classicyMeterValue",children:e})]})),r?s.jsxs("div",{className:g(D(x),q(V)),children:[s.jsx(j,{label:r}),h]}):h};M.__docgenInfo={description:'The `<meter>` equivalent: a themed gauge for a scalar within a known range\n(disk usage, battery, signal level) — not for task progress, which is\n`ClassicyProgressBar`\'s job. It follows the native `<meter>` zone semantics:\n`low` and `high` split the range into up to three regions, the region\nholding `optimum` is optimal (theme accent), an adjacent one suboptimal\n(`--color-alert`), and one two away bad (`--color-error`).\n\nRenders a continuous bar, or `segments` discrete LED-style cells for a\nlevel-meter look; `showValue` prints the number beside it. It exposes\n`role="meter"` with `aria-valuenow`/`min`/`max` rather than a native\n`<meter>`, which cannot be Platinum-styled across browsers.',methods:[],displayName:"ClassicyMeter",props:{min:{required:!1,tsType:{name:"number"},description:"Lower end of the gauge. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},max:{required:!1,tsType:{name:"number"},description:"Upper end of the gauge. Defaults to `100`.",defaultValue:{value:"100",computed:!1}},low:{required:!1,tsType:{name:"number"},description:"Values below this are in the low region. Omit for no low region."},high:{required:!1,tsType:{name:"number"},description:"Values above this are in the high region. Omit for no high region."},optimum:{required:!1,tsType:{name:"number"},description:`The ideal value: the region (low / middle / high) holding it is optimal.
Omitted, the middle region is optimal.`},value:{required:!0,tsType:{name:"number"},description:"The measured value; drawn clamped to `min`…`max`."},label:{required:!1,tsType:{name:"string"},description:"Visible label text; also the gauge's accessible name."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the gauge. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelAlign:{required:!1,tsType:{name:"ClassicyLabelAlign"},description:'Horizontal alignment of the label. Defaults to `"left"`.',defaultValue:{value:'"left"',computed:!1}},showValue:{required:!1,tsType:{name:"boolean"},description:"Print the numeric value beside the gauge."},segments:{required:!1,tsType:{name:"number"},description:`Render as this many discrete LED-style segments (AV level-meter look)
instead of a continuous bar.`}}};const O={title:"Controls/Meter",component:M,decorators:[e=>s.jsx("div",{style:{width:260},children:s.jsx(e,{})})]},o={args:{value:60,label:"Memory used",showValue:!0}},i={args:{value:12,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},n={args:{value:50,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},l={args:{value:95,low:60,high:90,optimum:10,label:"Macintosh HD",showValue:!0}},c={args:{value:7,max:10,segments:10,label:"Input level"}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    value: 60,
    label: "Memory used",
    showValue: true
  }
}`,...o.parameters?.docs?.source},description:{story:"No thresholds: the whole range is optimal, drawn in the theme accent, with the value printed beside it.",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    value: 12,
    low: 20,
    high: 80,
    optimum: 100,
    label: "Battery",
    showValue: true
  }
}`,...i.parameters?.docs?.source},description:{story:"Battery-style: `optimum` sits in the high region, so a low value (two regions away) is bad.",...i.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    value: 50,
    low: 20,
    high: 80,
    optimum: 100,
    label: "Battery",
    showValue: true
  }
}`,...n.parameters?.docs?.source},description:{story:"The same battery at half charge: one region from `optimum`, so it is suboptimal (`--color-alert`).",...n.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    value: 95,
    low: 60,
    high: 90,
    optimum: 10,
    label: "Macintosh HD",
    showValue: true
  }
}`,...l.parameters?.docs?.source},description:{story:"Disk-usage-style: `optimum` sits low, so a nearly-full disk (two regions away) is bad.",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    value: 7,
    max: 10,
    segments: 10,
    label: "Input level"
  }
}`,...c.parameters?.docs?.source},description:{story:"`segments` draws discrete LED-style cells — the audio level-meter look.",...c.parameters?.docs?.description}}};const E=["Basic","BatteryLow","BatteryHalf","DiskNearlyFull","SegmentedLevel"];export{o as Basic,n as BatteryHalf,i as BatteryLow,l as DiskNearlyFull,c as SegmentedLevel,E as __namedExportsOrder,O as default};
