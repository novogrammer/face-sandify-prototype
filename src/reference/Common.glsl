const int TYPE_AIR=0;
const int TYPE_SAND=1;
const int TYPE_WALL=2;

struct Cell{
  int type;
  float color;
};

Cell unpackCell(vec4 color){
    Cell cell;
    cell.type=int(color.r*255.0);
    cell.color=color.g;
    return cell;
}
vec4 packCell(Cell cell){
    vec4 color=vec4(1.0);
    color.r=float(cell.type)/255.0;
    color.g=cell.color;
    return color;
}

Cell getInitialCell(vec2 uv,float color){
    Cell cell;
    cell.type=TYPE_AIR;
    cell.color=color;
    
    if(length(uv.xy-vec2(0.35,0.5))<0.15){
        cell.type=TYPE_SAND;
    }
    if(length(uv.xy-vec2(0.75,0.5))<0.15){
        cell.type=TYPE_SAND;
    }
    
    if(length(uv.xy-vec2(0.15,0.25))<0.125){
        cell.type=TYPE_WALL;
    }
    if(length(uv.xy-vec2(0.65,0.25))<0.125){
        cell.type=TYPE_WALL;
    }
    if(length(uv.xy-vec2(0.35,0.75))<0.125){
        cell.type=TYPE_WALL;
    }
    if(length(uv.xy-vec2(0.85,0.75))<0.125){
        cell.type=TYPE_WALL;
    }
    return cell;
}

float toLuminance(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

