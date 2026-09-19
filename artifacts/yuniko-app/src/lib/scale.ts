export type DeviceClass="mobile"|"tablet"|"desktop";
export function getDeviceClass(width:number):DeviceClass{return width<768?"mobile":width<1024?"tablet":"desktop"}
export function getFeedPageSize(device:DeviceClass){return device==="mobile"?10:20}
export function shouldLoadMedia(index:number,visibleStart:number,visibleEnd:number){return index>=visibleStart-2&&index<=visibleEnd+3}
export function shouldPrefetch(nextPage:number,totalLoaded:number){return nextPage>0&&totalLoaded>=nextPage*8}
export const SCALE_LIMITS={feedPage:20,messagePage:50,maxUploadBytes:50*1024*1024,storyHours:24} as const;
