import Stats from "stats-gl";
import { ENABLE_FORCE_WEBGL } from './constants';
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
    forceWebGL:ENABLE_FORCE_WEBGL,
  });
  renderer.setSize( width, height );
  renderer.setAnimationLoop( animate );
  renderer.domElement.classList.add("p-background__canvas");
  backgroundElement.appendChild( renderer.domElement );
  const stats=new Stats({
    trackGPU: true,
    trackHz: true,
  });
  stats.init( renderer );
  stats.dom.style.top="0px";
  document.body.appendChild( stats.dom );




  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshStandardNodeMaterial();

  const sandSimulator = new SandSimulator(128,128);
  const cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  camera.position.z = 5;

  window.addEventListener("resize",()=>{
    onResize();
  })
  onResize();

  function onResize(){
    if(!backgroundElement){
      throw new Error("backgroundElement is null");
    }
    const {width,height}=getElementSize(backgroundElement);
    renderer.setSize(width,height);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }

  // testStructAsync(renderer).catch((error)=>{
  //   console.error(error);
  // })

  let isComputing=false;
  async function animate(){
    if(isComputing){
      console.log("skip");
      return;
    }
    isComputing=true;
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    await sandSimulator.updateFrameAsync(renderer);
    material.colorNode=sandSimulator.getColorNode();

    // {
    //   const rawShader = await renderer.debug.getShaderAsync( scene, camera, cube );
    //   console.log(rawShader);
    //   debugger;
    // }

    renderer.render( scene, camera );
    stats.update();
    isComputing=false;
  }

}



mainAsync().catch((error)=>{
  console.error(error);
});




