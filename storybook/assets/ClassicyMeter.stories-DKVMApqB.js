import{j as s,af as y,t as q,al as T,ap as C}from"./iframe-DsztQNeI.js";import"./preload-helper-PPVm8Dsz.js";const v=(e,a,r)=>a!==void 0&&e<a?0:r!==void 0&&e>r?2:1,N=(e,{low:a,high:r,optimum:l}={})=>{const m=v(e,a,r),d=l!==void 0?v(l,a,r):1,t=Math.abs(m-d);return t===0?"optimal":t===1?"suboptimal":"bad"},S={optimal:"classicyMeterOptimal",suboptimal:"classicyMeterSuboptimal",bad:"classicyMeterBad"},M=({value:e,min:a=0,max:r=100,low:l,high:m,optimum:d,label:t,labelPosition:w="above",labelAlign:x="left",showValue:V,segments:n})=>{const f=r-a,g=f>0?Math.min(1,Math.max(0,(e-a)/f)):0,j=N(e,{low:l,high:m,optimum:d}),b=s.jsx("div",{className:y("classicyMeter",S[j],n?"classicyMeterSegmented":""),role:"meter","aria-valuenow":e,"aria-valuemin":a,"aria-valuemax":r,"aria-label":t,children:n?Array.from({length:n},(L,h)=>s.jsx("div",{className:y("classicyMeterSegment",h<Math.round(g*n)?"classicyMeterSegmentOn":"")},h)):s.jsx("div",{className:"classicyMeterFill",style:{width:`${g*100}%`}})});let p=b;return V&&(p=s.jsxs("div",{className:"classicyMeterRow",children:[b,s.jsx("span",{className:"classicyMeterValue",children:e})]})),t?s.jsxs("div",{className:y(T(w),C(x)),children:[s.jsx(q,{label:t}),p]}):p};M.__docgenInfo={description:"",methods:[],displayName:"ClassicyMeter",props:{min:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"0",computed:!1}},max:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"100",computed:!1}},low:{required:!1,tsType:{name:"number"},description:""},high:{required:!1,tsType:{name:"number"},description:""},optimum:{required:!1,tsType:{name:"number"},description:""},value:{required:!0,tsType:{name:"number"},description:""},label:{required:!1,tsType:{name:"string"},description:""},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:"",defaultValue:{value:'"above"',computed:!1}},labelAlign:{required:!1,tsType:{name:"ClassicyLabelAlign"},description:"",defaultValue:{value:'"left"',computed:!1}},showValue:{required:!1,tsType:{name:"boolean"},description:"Print the numeric value beside the gauge."},segments:{required:!1,tsType:{name:"number"},description:`Render as this many discrete LED-style segments (AV level-meter look)
instead of a continuous bar.`}}};const D={title:"Controls/Meter",component:M,decorators:[e=>s.jsx("div",{style:{width:260},children:s.jsx(e,{})})]},o={args:{value:60,label:"Memory used",showValue:!0}},i={args:{value:12,low:20,high:80,optimum:100,label:"Battery",showValue:!0}},c={args:{value:95,low:60,high:90,optimum:10,label:"Macintosh HD",showValue:!0}},u={args:{value:7,max:10,segments:10,label:"Input level"}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    value: 60,
    label: "Memory used",
    showValue: true
  }
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    value: 12,
    low: 20,
    high: 80,
    optimum: 100,
    label: "Battery",
    showValue: true
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    value: 95,
    low: 60,
    high: 90,
    optimum: 10,
    label: "Macintosh HD",
    showValue: true
  }
}`,...c.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    value: 7,
    max: 10,
    segments: 10,
    label: "Input level"
  }
}`,...u.parameters?.docs?.source}}};const R=["Basic","BatteryLow","DiskNearlyFull","SegmentedLevel"];export{o as Basic,i as BatteryLow,c as DiskNearlyFull,u as SegmentedLevel,R as __namedExportsOrder,D as default};
