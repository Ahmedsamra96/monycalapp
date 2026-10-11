import { ImageResponse } from 'next/og';
// Self-contained image: wallet monogram on the app's navy-blue palette.
export function pwaIcon(size:number){
  const outer = Math.round(size*.17);
  return new ImageResponse(<div style={{
    width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
    background:'linear-gradient(135deg,#15346d,#4c78e4)',borderRadius:outer,position:'relative',overflow:'hidden'
  }}><div style={{position:'absolute',width:size*.83,height:size*.83,border:'2px solid rgba(255,255,255,.15)',borderRadius:size*.23,transform:'rotate(-17deg)',top:-size*.22,left:-size*.17}}/>
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:size*.61,height:size*.55,border:`${Math.max(5,Math.round(size*.037))}px solid white`,borderRadius:size*.11,background:'rgba(255,255,255,.1)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.29,color:'#fff',fontWeight:900}}>M</div>
  </div><div style={{position:'absolute',right:size*.18,bottom:size*.22,width:size*.13,height:size*.13,background:'#e9bb54',borderRadius:'50%',border:`${Math.max(3,Math.round(size*.018))}px solid #294e9c`}}/>
  </div>,{width:size,height:size});
}
