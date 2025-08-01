
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    Cell cell = unpackCell(texture(iChannel0,uv));
    
    vec4 color=vec4(1.0);
    
    if(cell.type==TYPE_WALL){
        color.rgb=vec3(0.0,cell.color,1.0);
    }else if(cell.type==TYPE_SAND){
        color.rgb=vec3(1.0,cell.color,0.0);
    }else{
        color.rgb=vec3(0.0);
    }
    
    
    fragColor = color;
}