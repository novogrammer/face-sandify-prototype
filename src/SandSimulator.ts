import { float, Fn, fract, If, instanceIndex, int, round, struct, texture, textureLoad, textureStore, time, uvec2, vec2, vec3, vec4 } from 'three/tsl';
import * as THREE from 'three/webgpu';
// 

const SHOW_WGSL_CODE=false;

const KIND_AIR=int(0);
const KIND_SAND=int(1);
const KIND_WALL=int(2);

// Cell構造体の定義
const Cell = struct({
    kind: 'int',
    color: 'float'
},"Cell");

// unpackCell関数  
const unpackCell = Fn(([color]:[ReturnType<typeof vec4>]) => {  
  const cell = Cell({
    kind:int(round(color.r.mul(255.0))),
    color:color.g,
  });
  return cell;  
});  

// packCell関数
const packCell = Fn(([cell]:[ReturnType<typeof Cell>]) => {
  const color = vec4(
    float(cell.get('kind')).div(255.0),
    cell.get('color'),
    1.0,
    1.0
  );
  return color;
});
// const toLuminance = Fn(([rgb]:[ReturnType<typeof vec3>])=>{
//   return dot(rgb,vec3(0.299, 0.587, 0.114));
// });

const toColor = Fn(([cell]:[ReturnType<typeof Cell>])=>{
  const rgb=vec3(1.0).toVar();
  
  If(cell.get("kind").equal(KIND_WALL),()=>{
    rgb.assign(vec3(0.0,cell.get("color"),1.0));

  }).ElseIf(cell.get("kind").equal(KIND_SAND),()=>{
    rgb.assign(vec3(1.0,cell.get("color"),0.0));

  }).Else(()=>{
    rgb.assign(vec3(0.0));
  })
  return vec4(rgb,1.0);
});

export class SandSimulator{
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
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      return texture;
    }
    this.inputTexture=makeTexture();
    // console.log(`flipY: ${this.inputTexture.flipY}`);
    this.outputTexture=makeTexture();
    
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
        If(uv.sub(0).length().lessThanEqual(0.5),()=>{
          cellColorNext.assign(packCell(Cell({
            kind:KIND_SAND,
            color:float(1),
          })));
        }).Else(()=>{
          cellColorNext.assign(packCell(Cell({
            kind:KIND_AIR,
            color:float(0),
          })));
        });
      }).Else(()=>{
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

  getColorNode(){
    // return texture(this.outputTexture);
    const cell = unpackCell(texture(this.outputTexture));
    const color=toColor(cell);
    return color;
  }

  async updateFrameAsync(renderer:THREE.WebGPURenderer) {  
    this.toggleTexture();


    // コンピュートシェーダーを実行  
    const computeNode = this.computeShader(this.inputTexture,this.outputTexture).compute(this.width*this.height);
    await renderer.computeAsync(computeNode);  

    if(SHOW_WGSL_CODE){
      console.log((renderer as any)._nodes.getForCompute(computeNode).computeShader);
      debugger;
    }

      

  }
}