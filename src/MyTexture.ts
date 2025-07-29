import { Fn, fract, If, instanceIndex, texture, textureLoad, textureStore, time, uvec2, vec2, vec3, vec4 } from 'three/tsl';
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

    const makeTexture=()=>{
      const texture=new THREE.StorageTexture(width, height);
      texture.type=THREE.HalfFloatType;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }
    this.inputTexture=makeTexture();
    this.outputTexture=makeTexture();
    // this.inputTexture.type=THREE.HalfFloatType;
    // this.outputTexture.type=THREE.HalfFloatType;

    
    
    // コンピュートシェーダーの定義  
    this.computeShader = Fn(([inputTexture, outputTexture]:[THREE.StorageTexture,THREE.StorageTexture]) => {  
        const coord = uvec2(instanceIndex.mod(width), instanceIndex.div(width));  
        
        // 前フレームのデータを読み込み  
        const prevColor = textureLoad(inputTexture, coord);  
        const prevColorUp = textureLoad(inputTexture, coord.add(uvec2(0,1)).mod((uvec2(width,height))));  
        
        const newColor=vec4(0.0).toVar();
        
        // UV座標を手動で計算  
        const uv = vec2(coord).div(vec2(width, height));

        const eachProgress = fract(time);
        If(eachProgress.lessThanEqual(0.1).and(uv.sub(0.5).length().lessThan(0.5)),()=>{
          // 初期化処理
          newColor.assign(vec4(  
              vec3(1.0),  
              prevColor.a 
          ));
        }).Else(()=>{
          newColor.assign(vec4(
            prevColorUp.rgb.mul(0.99),
            prevColor.a
          ));
        });

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