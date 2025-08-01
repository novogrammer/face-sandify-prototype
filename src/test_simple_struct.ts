import { float, Fn, struct } from "three/tsl";
import { NodeMaterial } from "three/webgpu";

export function testSimpleStructNode(material:NodeMaterial){
  const S=struct({
    a:"float",
    b:"float",
  })
  const simple=Fn(([a,b]:[ReturnType<typeof float>,ReturnType<typeof float>])=>{
    const s=S({
      a,
      b,
    });
    const result = s.get("a").add(s.get("b"));
    return result;
  })
  material.colorNode=simple(float(0.25),float(0.75));

}
