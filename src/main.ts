import Stats from "stats-gl";
import { ENABLE_FORCE_WEBGL, SAND_SIMULATOR_WIDTH, SAND_SIMULATOR_HEIGHT } from './constants';
import { getElementSize } from './dom_utils';
import { SandSimulator } from './SandSimulator';
import './style.scss'

import * as THREE from 'three/webgpu';
// import { testStructAsync } from './test_struct';


async function mainAsync(){
  const backgroundElement=document.querySelector<HTMLHtmlElement>(".p-background");

  if(!backgroundElement){
    throw new Error("backgroundElement is null");
  }

  const {width,height}=getElementSize(backgroundElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 30, width / height, 0.1, 1000 );

  {
    const ambientLight=new THREE.AmbientLight(0xffffff,0.6);
    scene.add(ambientLight);
  }
  {
    const directionalLight=new THREE.DirectionalLight(0xffffff,2);
    directionalLight.position.set(10,10,10);
    scene.add(directionalLight);
  }


  const renderer = new THREE.WebGPURenderer({
    antialias:true,
    forceWebGL:ENABLE_FORCE_WEBGL,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize( width, height );
  renderer.domElement.classList.add("p-background__canvas");
  backgroundElement.appendChild( renderer.domElement );
  const stats=new Stats({
    precision:3,
    trackHz: true,
    trackGPU: true,
    trackCPT: true,
  });
  stats.init( renderer );
  stats.dom.style.top="0px";
  document.body.appendChild( stats.dom );




  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshStandardNodeMaterial();

  const webcamVideoElement = document.querySelector<HTMLVideoElement>(".p-webcam-video");
  if(!webcamVideoElement){
    throw new Error("webcamVideoElement is null");
  }
  let webcamCanvasTexture:THREE.CanvasTexture;
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    const constraints={
      video:{
        width: 1280,
        height: 720,
        facingMode: 'user',
      },
    };
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
      webcamVideoElement.srcObject = stream;
    }).catch(function(error){
      console.error('Unable to access the camera/webcam.', error);
    });
  } else {
    console.error('MediaDevices interface not available.');
  }
  const canvasElement = document.createElement("canvas");
  await new Promise<void>((resolve)=>{
    webcamVideoElement.addEventListener('loadedmetadata', () => {
      webcamVideoElement.play();
      resolve();
    },{once:true});
    
  });
  canvasElement.width  = webcamVideoElement.videoWidth;
  canvasElement.height = webcamVideoElement.videoHeight;

  const ctx=canvasElement.getContext("2d");
  if(!ctx){
    throw new Error("ctx is null");
  }
  // TODO: このタイミングの描画がうまく反映できていない。
  await new Promise<void>((resolve)=>{
    setTimeout(resolve,500);
  });
  ctx.drawImage(webcamVideoElement!,0,0);

  webcamCanvasTexture=new THREE.CanvasTexture(canvasElement);
  

  const sandSimulator = new SandSimulator(SAND_SIMULATOR_WIDTH,SAND_SIMULATOR_HEIGHT,webcamCanvasTexture,new THREE.Vector2(canvasElement.width,canvasElement.height));
  const cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  camera.position.z = 2.5;

  window.addEventListener("resize",()=>{
    onResize();
  })
  onResize();

  function onResize(){
    if(!backgroundElement){
      throw new Error("backgroundElement is null");
    }
    const {width,height}=getElementSize(backgroundElement);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width,height);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }

  // testStructAsync(renderer).catch((error)=>{
  //   console.error(error);
  // })

  let isComputing=false;
  let previousTime=-0.001;

  renderer.setAnimationLoop( animate );
  async function animate(){
    if(isComputing){
      console.log("skip");
      return;
    }
    isComputing=true;
    const time=performance.now()*0.001;

    if(ctx){
      ctx.drawImage(webcamVideoElement!,0,0);
      webcamCanvasTexture.needsUpdate=true;

    }


    const duration=10;
    const isCapturing = Math.floor(previousTime/duration) < Math.floor(time/duration);

    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    await sandSimulator.updateFrameAsync(renderer,isCapturing);
    renderer.resolveTimestampsAsync( THREE.TimestampQuery.COMPUTE );
    material.colorNode=sandSimulator.getColorNode();

    // {
    //   const rawShader = await renderer.debug.getShaderAsync( scene, camera, cube );
    //   console.log(rawShader);
    //   debugger;
    // }

    await renderer.renderAsync( scene, camera );
    renderer.resolveTimestampsAsync( THREE.TimestampQuery.RENDER );
    stats.update();
    previousTime=time;
    isComputing=false;
  }

}



mainAsync().catch((error)=>{
  console.error(error);
});




