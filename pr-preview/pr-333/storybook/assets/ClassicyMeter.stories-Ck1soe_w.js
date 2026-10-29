import{j as s,aD as p,I as S,aF as C,aG as L}from"./iframe-u6CF_fLd.js";import"./preload-helper-shce2T3m.js";const T=(e,a,t)=>a!==void 0&&e<a?0:t!==void 0&&e>t?2:1,k=(e,{low:a,high:t,optimum:u}={})=>{const h=T(e,a,t),g=u!==void 0?T(u,a,t):1,r=Math.abs(h-g);return r===0?"optimal":r===1?"suboptimal":"bad"},N={optimal:"classicyMeterOptimal",suboptimal:"classicyMeterSuboptimal",bad:"classicyMeterBad"},q=({value:e,min:a=0,max:t=100,low:u,high:h,optimum:g,label:r,labelPosition:j="above",labelAlign:B="left",showValue:w,segments:m,className:y,style:b})=>{const v=t-a,x=v>0?Math.min(1,Math.max(0,(e-a)/v)):0,D=k(e,{low:u,high:h,optimum:g}),d=r?"label":w?"row":"gauge",M=s.jsx("div",{className:p("classicyMeter",N[D],m?"classicyMeterSegmented":"",d==="gauge"?y:""),style:d==="gauge"?b:void 0,role:"meter","aria-valuenow":e,"aria-valuemin":a,"aria-valuemax":t,"aria-label":r,children:m?Array.from({length:m},(I,V)=>s.jsx("div",{className:p("classicyMeterSegment",V<Math.round(x*m)?"classicyMeterSegmentOn":"")},V)):s.jsx("div",{className:"classicyMeterFill",style:{width:`${x*100}%`}})});let f=M;return w&&(f=s.jsxs("div",{className:p("classicyMeterRow",d==="row"?y:""),style:d==="row"?b:void 0,children:[M,s.jsx("span",{className:"classicyMeterValue",children:e})]})),r?s.jsxs("div",{className:p(C(j),L(B),y),style:b,children:[s.jsx(S,{label:r}),f]}):f};q.__docgenInfo={description:'The `<meter>` equivalent: a themed gauge for a scalar within a known range\n(disk usage, battery, signal level) — not for task progress, which is\n`ClassicyProgressBar`\'s job. It follows the native `<meter>` zone semantics:\n`low` and `high` split the range into up to three regions, the region\nholding `optimum` is optimal (theme accent), an adjacent one suboptimal\n(`--color-alert`), and one two away bad (`--color-error`).\n\nRenders a continuous bar, or `segments` discrete LED-style cells for a\nlevel-meter look; `showValue` prints the number beside it. It exposes\n`role="meter"` with `aria-valuenow`/`min`/`max` rather than a native\n`<meter>`, which cannot be Platinum-styled across browsers.',methods:[],displayName:"ClassicyMeter",props:{min:{required:!1,tsType:{name:"number"},description:"Lower end of the gauge. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},max:{required:!1,tsType:{name:"number"},description:"Upper end of the gauge. Defaults to `100`.",defaultValue:{value:"100",computed:!1}},low:{required:!1,tsType:{name:"number"},description:"Values below this are in the low region. Omit for no low region."},high:{required:!1,tsType:{name:"number"},description:"Values above this are in the high region. Omit for no high region."},optimum:{required:!1,tsType:{name:"number"},description:`The ideal value: the region (low / middle / high) holding it is optimal.
Omitted, the middle region is optimal.`},value:{required:!0,tsType:{name:"number"},description:"The measured value; drawn clamped to `min`…`max`."},label:{required:!1,tsType:{name:"string"},description:"Visible label text; also the gauge's accessible name."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the gauge. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelAlign:{required:!1,tsType:{name:"ClassicyLabelAlign"},description:'Horizontal alignment of the label. Defaults to `"left"`.',defaultValue:{value:'"left"',computed:!1}},showValue:{required:!1,tsType:{name:"boolean"},description:"Print the numeric value beside the gauge."},segments:{required:!1,tsType:{name:"number"},description:`Render as this many discrete LED-style segments (AV level-meter look)
instead of a continuous bar.`},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the outermost element (the label wrapper, else the value row, else the gauge) after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the outermost element (the label wrapper, else the value row, else the gauge) after the component's own."}}};const E={title:"Controls/Meter",component:q,decorators:[e=>s.jsx("div",{style:{width:260},children:s.jsx(e,{})})]},o={args:{value:60,label:"Memory used",showValue:!0}},i={args:{value:12,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},n={args:{value:50,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},l={args:{value:95,low:60,high:90,optimum:10,label:"Macintosh HD",showValue:!0}},c={args:{value:7,max:10,segments:10,label:"Input level"}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source},description:{story:"`segments` draws discrete LED-style cells — the audio level-meter look.",...c.parameters?.docs?.description}}};const R=["Basic","BatteryLow","BatteryHalf","DiskNearlyFull","SegmentedLevel"];export{o as Basic,n as BatteryHalf,i as BatteryLow,l as DiskNearlyFull,c as SegmentedLevel,R as __namedExportsOrder,E as default};
