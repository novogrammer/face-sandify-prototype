import { float, Fn, fract, If, instanceIndex, int, struct, texture, textureLoad, textureStore, time, uvec2, vec2, vec3, vec4 } from 'three/tsl';
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

    // Cell構造体の定義
    const Cell = struct({
        typo: 'int',
        color: 'float'
    });
    // unpackCell関数  
    const unpackCell = Fn(([colorVec]:[ReturnType<typeof vec4>]) => {  
      const cell = Cell().toVar();
      // @ts-ignore
      cell.get("typo").assign(int(colorVec.r.mul(255.0)));
      // @ts-ignore
      cell.get("color").assign(colorVec.g);
      return cell;  
    });  
    
    // packCell関数
    const packCell = Fn(([cell]:[typeof Cell]) => {
      const color = vec4().toVar();
      color.assign(vec4(
        // @ts-ignore
        float(cell.get('typo')).div(255.0),
        // @ts-ignore
        cell.get('color'),
        1.0,
        1.0
      ));
      return color;
    });


    
    // コンピュートシェーダーの定義  
    this.computeShader = Fn(([inputTexture, outputTexture]:[THREE.StorageTexture,THREE.StorageTexture]) => {
      const coord = uvec2(instanceIndex.mod(width), instanceIndex.div(width));  
      
      // 前フレームのデータを読み込み  
      // const cell = unpackCell(textureLoad(inputTexture, coord));
      const cellUp = unpackCell(textureLoad(inputTexture, coord.add(uvec2(0,1)).mod((uvec2(width,height)))));
      
      const cellColorNext=vec4(0.0).toVar();
      
      // UV座標を手動で計算  
      const uv = vec2(coord).div(vec2(width, height));

      const eachProgress = fract(time.div(5));
      If(eachProgress.lessThanEqual(0.1),()=>{
        // 初期化処理
        If(uv.sub(0.5).length().lessThanEqual(0.5),()=>{
          cellColorNext.assign(vec4(  
              vec3(1.0),  
              1.0
          ));
        }).Else(()=>{
          cellColorNext.assign(vec4(  
              vec3(0.0),  
              1.0
          ));
        });
      }).Else(()=>{
        // @ts-ignore
        cellColorNext.assign(packCell(cellUp));
      });

      // 結果を書き込み  
      textureStore(outputTexture, coord, cellColorNext);  
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

    // console.log((renderer as any)._nodes.getForCompute(computeNode));
    // debugger;

      

  }
}