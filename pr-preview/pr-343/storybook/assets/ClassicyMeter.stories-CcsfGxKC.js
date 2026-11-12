import{j as o}from"./iframe-CR19K7z6.js";import{C as n}from"./ClassicyMeter-DOKl1X1g.js";import"./preload-helper-CxPGPiBr.js";const u={title:"Controls/Meter",component:n,decorators:[l=>o.jsx("div",{style:{width:260},children:o.jsx(l,{})})]},e={args:{value:60,label:"Memory used",showValue:!0}},r={args:{value:12,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},s={args:{value:50,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},a={args:{value:95,low:60,high:90,optimum:10,label:"Macintosh HD",showValue:!0}},t={args:{value:7,max:10,segments:10,label:"Input level"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    value: 60,
    label: "Memory used",
    showValue: true
  }
}`,...e.parameters?.docs?.source},description:{story:"No thresholds: the whole range is optimal, drawn in the theme accent, with the value printed beside it.",...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    value: 12,
    low: 20,
    high: 80,
    optimum: 100,
    label: "Battery",
    showValue: true
  }
}`,...r.parameters?.docs?.source},description:{story:"Battery-style: `optimum` sits in the high region, so a low value (two regions away) is bad.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    value: 50,
    low: 20,
    high: 80,
    optimum: 100,
    label: "Battery",
    showValue: true
  }
}`,...s.parameters?.docs?.source},description:{story:"The same battery at half charge: one region from `optimum`, so it is suboptimal (`--color-alert`).",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    value: 95,
    low: 60,
    high: 90,
    optimum: 10,
    label: "Macintosh HD",
    showValue: true
  }
}`,...a.parameters?.docs?.source},description:{story:"Disk-usage-style: `optimum` sits low, so a nearly-full disk (two regions away) is bad.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    value: 7,
    max: 10,
    segments: 10,
    label: "Input level"
  }
}`,...t.parameters?.docs?.source},description:{story:"`segments` draws discrete LED-style cells \u2014 the audio level-meter look.",...t.parameters?.docs?.description}}};const p=["Basic","BatteryLow","BatteryHalf","DiskNearlyFull","SegmentedLevel"];export{e as Basic,s as BatteryHalf,r as BatteryLow,a as DiskNearlyFull,t as SegmentedLevel,p as __namedExportsOrder,u as default};
