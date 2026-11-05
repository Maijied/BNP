import { PathaoError } from "./provider/service.js";
import { withDeadline } from "./provider/webhook.js";
export function json(value,status=200) {return Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
export async function readJson(request,maxBytes=16384) {
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new PathaoError('JSON content type required.',415);
  if(request.headers.has('content-encoding') && request.headers.get('content-encoding')!=='identity')throw new PathaoError('Compressed requests are not accepted.',415);
  const length=request.headers.get('content-length');
  if(length!==null && (!/^\d+$/.test(length)||Number(length)>maxBytes))throw new PathaoError('Request is too large.',413);
  if(!request.body)throw new PathaoError('Invalid JSON.',400);
  const reader=request.body.getReader();
  try {return await withDeadline((async()=>{
    const chunks=[];let length=0;
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes)throw new PathaoError('Request is too large.',413);chunks.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    try {const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new PathaoError('Invalid JSON.',400);}
  })(),5000);}finally{reader.cancel().catch(()=>{});}
}
