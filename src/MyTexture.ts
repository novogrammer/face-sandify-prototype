import { Fn, instanceIndex, texture, textureLoad, textureStore, uvec2, vec3, vec4 } from 'three/tsl';
import * as THREE from 'three/webgpu';


export class MyTexture{
  width:number;
  height:number;

  inputTexture:THREE.StorageTexture;
  outputTexture:THREE.StorageTexture;
  computeShader:THREE.TSL.ShaderNodeFn<[THREE.StorageTexture, THREE.StorageTexture]>;

  constructor(width:number,height:number){
    this.width=width;
    this.height=height;

      
    this.inputTexture=new THREE.StorageTexture(width, height);
    this.outputTexture=new THREE.StorageTexture(width, height);
    // this.inputTexture.type=THREE.HalfFloatType;
    // this.outputTexture.type=THREE.HalfFloatType;
    
    // コンピュートシェーダーの定義  
    this.computeShader = Fn(([inputTexture, outputTexture]:[THREE.StorageTexture,THREE.StorageTexture]) => {  
        const coord = uvec2(instanceIndex.mod(width), instanceIndex.div(width));  
          
        // 前フレームのデータを読み込み  
        const prevColor = textureLoad(inputTexture, coord);  
          
        // RGB反転処理  
        const newColor = vec4(  
            vec3(1.0).sub(prevColor.rgb), // RGB各チャンネルを1.0から引く  
            prevColor.a                   // アルファは保持  
        );  
        // 結果を書き込み  
        textureStore(outputTexture, coord, newColor);  
    });  
  

  }
  toggleTexture(){
    const {inputTexture,outputTexture}=this;
    this.inputTexture=outputTexture;
    this.outputTexture=inputTexture;
  }

  getOutputTextureNode(){
    return texture(this.outputTexture);
  }

  async updateFrameAsync(renderer:THREE.WebGPURenderer) {  
    this.toggleTexture();
    // コンピュートシェーダーを実行  
    const computeNode = this.computeShader(this.inputTexture,this.outputTexture).compute(this.width*this.height);
      
    await renderer.computeAsync(computeNode);  

  }
}