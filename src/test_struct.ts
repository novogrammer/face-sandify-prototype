import { float, Fn, instancedArray, instanceIndex, struct } from "three/tsl";
import type { WebGPURenderer } from "three/webgpu";

export async function testStructAsync(renderer:WebGPURenderer){
  const count = 100;

  const Complex = struct({
      real:'float',
      imaginary:'float',
  },"Complex");

  const aArray = new Float32Array( count * 2 );
  const aStorage = instancedArray( aArray, Complex ).label( 'aStorage' );
  const bArray = new Float32Array( count * 2 );
  const bStorage = instancedArray( bArray, Complex ).label( 'bStorage' );
  const cArray = new Float32Array( count * 2 );
  const cStorage = instancedArray( cArray, Complex ).label( 'cStorage' );

  const multiply = Fn(([a,b]:[a:ReturnType<typeof Complex>,b:ReturnType<typeof Complex>]):ReturnType<typeof Complex>=>{
  const ar=a.get("real");
  const ai=a.get("imaginary");
  const br=b.get("real");
  const bi=b.get("imaginary");
  return Complex({
    real: ar.mul(br).sub(ai.mul(bi)),
    imaginary: ar.mul(bi).add(ai.mul(br))
  });
})

  const computeShader=Fn(()=>{
    
    const a=aStorage.element(instanceIndex).toVar();
    const b=bStorage.element(instanceIndex).toVar();
    const c=cStorage.element(instanceIndex);
    c.assign(multiply(a,b));
    

    const complexA = Complex(float(2),float(1));
    const complexB = Complex({
      real:float(2),
      imaginary:float(-1),
    });
    const complexC = multiply(complexA,complexB);
    c.assign(complexC);
    // complexC.get("real").mul(0);
    
  });

  const computeNode = computeShader().compute(100);
  await renderer.computeAsync(computeNode);  

  console.log((renderer as any)._nodes.getForCompute(computeNode).computeShader);
  
}