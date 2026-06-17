// Hero background — animated WebGL grid shader with mouse-reactive glow.
(function () {
    const canvas = document.getElementById('shader-canvas-ANIMATION_2');
    if (!canvas) return;

    // Sync the WebGL drawing-buffer size with the CSS-driven layout size.
    // This fires on initial layout and whenever the element is resized.
    function syncSize() {
        const w = canvas.clientWidth || 1280;
        const h = canvas.clientHeight || 720;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(syncSize).observe(canvas);
    }
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

float grid(vec2 uv, float res) {
    vec2 grid = fract(uv * res);
    float line = smoothstep(0.02, 0.0, abs(grid.x - 0.5)) + smoothstep(0.02, 0.0, abs(grid.y - 0.5));
    return line * 0.15;
}

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;

    // Background color
    vec3 color = vec3(0.039, 0.059, 0.118); // #0A0F1E

    // Grid
    float g1 = grid(uv + u_time * 0.01, 15.0);
    float g2 = grid(uv - u_time * 0.005, 30.0);
    color += (g1 + g2) * vec3(0.0, 0.83, 1.0); // Cyan glow

    // Mouse Glow
    float dist = distance(uv, mouse);
    float glow = smoothstep(0.3, 0.0, dist) * 0.2;
    color += glow * vec3(0.0, 0.83, 1.0);

    // Subtle gradient
    color += vec3(0.106, 0.227, 0.42) * (1.0 - uv.y) * 0.2; // Deep navy at bottom

    gl_FragColor = vec4(color, 1.0);
}`;
    function cs(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    // u_mouse is in pixel coordinates matching u_resolution (ShaderToy convention).
    // Shaders that need normalized coords should use: u_mouse / u_resolution.
    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    window.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width && rect.height) {
            const nx = (event.clientX - rect.left) / rect.width;
            const ny = 1.0 - (event.clientY - rect.top) / rect.height;
            mouse.x = nx * canvas.width;
            mouse.y = ny * canvas.height;
        }
    });

    function render(t) {
        if (typeof ResizeObserver === 'undefined') syncSize();
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uTime) gl.uniform1f(uTime, t * 0.001);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
        if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    render(0);
})();
