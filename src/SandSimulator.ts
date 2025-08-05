import { array, bool, float, Fn, frameId, If, instanceIndex, int, Loop, round, select, dot, struct, texture, textureLoad, textureStore, uniform, uvec2, vec2, vec3, vec4, type ShaderNodeObject, mix, clamp, length } from 'three/tsl';
import * as THREE from 'three/webgpu';
import { SHOW_WGSL_CODE } from './constants';
// 


const KIND_AIR=int(0);
const KIND_SAND=int(1);
const KIND_WALL=int(2);

// Cell構造体の定義
const Cell = struct({
    kind: 'int',
    luminance: 'float'
},"Cell");

// unpackCell関数  
const unpackCell = Fn(([color]:[ReturnType<typeof vec4>]) => {  
  const cell = Cell({
    kind:int(round(color.r.mul(255.0))),
    luminance:color.g,
  });
  return cell;  
});  

// packCell関数
const packCell = Fn(([cell]:[ReturnType<typeof Cell>]) => {
  const color = vec4(
    float(cell.get('kind')).div(255.0),
    cell.get('luminance'),
    1.0,
    1.0
  );
  return color;
});
const toLuminance = Fn(([rgb]:[ReturnType<typeof vec3>])=>{
  return dot(rgb,vec3(0.299, 0.587, 0.114));
});

const toColor = Fn(([cell]:[ReturnType<typeof Cell>])=>{
  const rgb=vec3(1.0).toVar();
  const luminance=cell.get("luminance").toVar();
  If(cell.get("kind").equal(KIND_WALL),()=>{
    rgb.assign(mix(vec3(0.0,0.0,0.5),vec3(0.0,1.0,1.0),luminance));
  }).ElseIf(cell.get("kind").equal(KIND_SAND),()=>{
    rgb.assign(mix(vec3(0.75,0.0,0.0),vec3(1.0,0.75,0.0),luminance));
  }).Else(()=>{
    rgb.assign(vec3(0.0));
  })
  return vec4(rgb,1.0);
});
const distPointSegment=Fn(([p,a,b]:[ReturnType<typeof vec2>,ReturnType<typeof vec2>,ReturnType<typeof vec2>])=>{
  const pa = p.sub(a).toVar();
  const ba = b.sub(a).toVar();
  const t = clamp(dot(pa,ba).div(dot(ba,ba)),0.0,1.0).toVar();
  const proj = a.add(ba.mul(t)).toVar();
  return length(p.sub(proj));
});

export class SandSimulator{
  width:number;
  height:number;
  webcamTexture:THREE.Texture;
  

  storageTexturePing:THREE.StorageTexture;
  storageTexturePong:THREE.StorageTexture;

  uIsCapturing:ShaderNodeObject<THREE.UniformNode<number>>;
  uWebcamTextureSize:ShaderNodeObject<THREE.UniformNode<THREE.Vector2>>;

  computeNodePing:ShaderNodeObject<THREE.ComputeNode>;
  computeNodePong:ShaderNodeObject<THREE.ComputeNode>;

  colorNodePing:ShaderNodeObject<THREE.TSL.ShaderCallNodeInternal>;
  colorNodePong:ShaderNodeObject<THREE.TSL.ShaderCallNodeInternal>;


  isPing:boolean=true;

  constructor(width:number,height:number,webcamTexture:THREE.Texture,webcamTextureSize:THREE.Vector2){
    this.width=width;
    this.height=height;
    this.webcamTexture=webcamTexture;

    const makeTexture=()=>{
      const texture=new THREE.StorageTexture(width, height);
      texture.type=THREE.HalfFloatType;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      // texture.minFilter = THREE.LinearFilter;
      // texture.magFilter = THREE.LinearFilter;
      return texture;
    }
    this.storageTexturePing=makeTexture();
    this.storageTexturePong=makeTexture();
    

    this.uIsCapturing=uniform(0);
    this.uWebcamTextureSize=uniform(webcamTextureSize);
    
    
    // コンピュートシェーダーの定義  
    const computeShader = Fn(([inputTexture, outputTexture]:[THREE.StorageTexture,THREE.StorageTexture]) => {
      const coord = uvec2(instanceIndex.mod(width), instanceIndex.div(width)).toVar("coord");
      // UV座標を手動で計算
      const uv = vec2(coord).div(vec2(width, height)).toVar("uv");
      const uvWebcam=uv.sub(0.5).mul(this.uWebcamTextureSize.yy).div(this.uWebcamTextureSize.xy).add(0.5).toVar("uvWebcam");

      const useLeftPriority = frameId.mod(2).equal(int(0)).toVar("useLeftPriority");
      const useLeftFactor = vec2(select(useLeftPriority , 1.0 , -1.0), 1.0).toVar("useLeftFactor");


      // 前フレームのデータを読み込み  
      const cellNeighborList = array([
        Cell(), Cell(), Cell(),
        Cell(), Cell(), Cell(),
        Cell(), Cell(), Cell(),
      ]).toVar("cellNeighborList");
      Loop(3,3,({i,j})=>{
        const index = int(j).mul(3).add(i).toVar("index");
        const x=int(i).sub(1).toVar("x");
        const y=int(j).sub(1).toVar("y");
        const offset = uvec2(x,y).mul(useLeftFactor).toVar("offset");
        const uvNeighbor = coord.add(offset).mod((uvec2(width,height))).toVar("uvNeighbor");

        const cell = unpackCell(textureLoad(inputTexture, uvNeighbor)).toVar("cell");

        cellNeighborList.element(index).assign(cell)
      });
      
      const cellSelf = cellNeighborList.element(int(1 * 3 + 1)).toVar("cellSelf");

      const cellUp = cellNeighborList.element(int(2 * 3 + 1)).toVar("cellUp");
      const cellFirstDiagonalUp = cellNeighborList.element(int(2 * 3 + 0)).toVar("cellFirstDiagonalUp");
      const cellFirstSideUp = cellNeighborList.element(int(1 * 3 + 0)).toVar("cellFirstSideUp");
      const cellSecondDiagonalUp = cellNeighborList.element(int(2 * 3 + 2)).toVar("cellSecondDiagonalUp");
      const cellSecondSideUp = cellNeighborList.element(int(1 * 3 + 2)).toVar("cellSecondSideUp");

      const cellDown = cellNeighborList.element(int(0 * 3 + 1)).toVar("cellDown");
      const cellFirstDiagonalDown = cellNeighborList.element(int(0 * 3 + 2)).toVar("cellFirstDiagonalDown");
      const cellFirstSideDown = cellNeighborList.element(int(1 * 3 + 2)).toVar("cellFirstSideDown");
      const cellSecondDiagonalDown = cellNeighborList.element(int(0 * 3 + 0)).toVar("cellSecondDiagonalDown");
      const cellSecondSideDown = cellNeighborList.element(int(1 * 3 + 0)).toVar("cellSecondSideDown");

      const cellNext = Cell().toVar("cellNext");

      cellNext.assign(cellSelf);

      If(cellSelf.get("kind").equal(KIND_AIR),()=>{
        // watch up

        If(cellUp.get("kind").equal(KIND_SAND),()=>{
          cellNext.assign(cellUp);
        }).ElseIf(bool(cellFirstDiagonalUp.get("kind").equal(KIND_SAND)).and(bool(cellFirstSideUp.get("kind").notEqual(KIND_AIR))),()=>{
          cellNext.assign(cellFirstDiagonalUp);
        }).ElseIf(bool(cellSecondDiagonalUp.get("kind").equal(KIND_SAND)).and(bool(cellSecondSideUp.get("kind").notEqual(KIND_AIR))),()=>{
          cellNext.assign(cellSecondDiagonalUp);
        }).Else(()=>{
          // DO NOTHING
        });

      }).ElseIf(cellSelf.get("kind").equal(KIND_SAND), ()=>{
        // watch down

        const cellAir=Cell(KIND_AIR,float(0)).toVar("cellAir");
        If(cellDown.get("kind").equal(KIND_AIR),()=>{
          cellNext.assign(cellAir);
        }).ElseIf(bool(cellFirstDiagonalDown.get("kind").equal(KIND_AIR)).and(bool(cellFirstSideDown.get("kind").equal(KIND_AIR))),()=>{
          cellNext.assign(cellAir);
        }).ElseIf(bool(cellSecondDiagonalDown.get("kind").equal(KIND_AIR)).and(bool(cellSecondSideDown.get("kind").equal(KIND_AIR))),()=>{
          cellNext.assign(cellAir);
        }).Else(()=>{
          // DO NOTHING
        });
      }).Else(()=>{
        // DO NOTHING
      });
      

      If(bool(this.uIsCapturing),()=>{
        // 初期化処理
        cellNext.assign(Cell({
          kind:KIND_AIR,
          luminance:float(0),
        }));
        If(uv.sub(0.5).length().lessThanEqual(0.2),()=>{
          cellNext.assign(Cell({
            kind:KIND_SAND,
            // luminance:float(sin(uv.mul(360*10).radians()).length()),
            luminance:toLuminance(texture(this.webcamTexture,uvWebcam)),
          }));
        });

        const distanceList=array([
          distPointSegment(uv,vec2(0.0,0.95),vec2(0.3,0.9)),
          distPointSegment(uv,vec2(1.0,0.95),vec2(0.7,0.9)),
          distPointSegment(uv,vec2(0.2,0.05),vec2(0.8,0.05)),
        ]);

        Loop(3,({i})=>{
          const distance=distanceList.element(int(i)).toVar();
          If(distance.lessThanEqual(float(3).div(width)),()=>{
            cellNext.assign(Cell({
              kind:KIND_WALL,
              // luminance:float(sin(uv.mul(360*10).radians()).length()),
              // luminance:toLuminance(texture(this.webcamTexture,uvWebcam)),
              luminance:float(1.0),
            }));
          });

        });

      });

      const cellColorNext=packCell(cellNext).toVar("cellColorNext");

      // 結果を書き込み  
      textureStore(outputTexture, coord, cellColorNext);  
    });  

    this.computeNodePing=computeShader(this.storageTexturePing,this.storageTexturePong).compute(this.width*this.height);
    this.computeNodePong=computeShader(this.storageTexturePong,this.storageTexturePing).compute(this.width*this.height);

    {
      const cell = unpackCell(texture(this.storageTexturePong));
      const color=toColor(cell);
      this.colorNodePing=color;
    }
    {
      const cell = unpackCell(texture(this.storageTexturePing));
      const color=toColor(cell);
      this.colorNodePong=color;
    }
  }
  toggleTexture(){
    this.isPing=!this.isPing;
  }

  getColorNode(){
    if(this.isPing){
      return this.colorNodePing;
    }else{
      return this.colorNodePong;
    }
  }

  async updateFrameAsync(renderer:THREE.WebGPURenderer,isCapturing:boolean) {  
    this.toggleTexture();


    // コンピュートシェーダーを実行  
    this.uIsCapturing.value=isCapturing?1:0;

    let computeNode;
    if(this.isPing){
      computeNode=this.computeNodePing;
    }else{
      computeNode=this.computeNodePong;
    }
    await renderer.computeAsync(computeNode);  

    if(SHOW_WGSL_CODE){
      console.log((renderer as any)._nodes.getForCompute(computeNode).computeShader);
      debugger;
    }

      

  }
}