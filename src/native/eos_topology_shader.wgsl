// EOS SYSTEM — SOVEREIGN FLEET 3D TOPOLOGY WEBGPU COMPUTE SHADER (WGSL)
// Governed by ADR-037, SPEC-030, FR-083, BDD-071
// Executes orthographic 3D projection and particle drift in parallel workgroups of size 64.

struct NodeInput {
  x: f32,
  y: f32,
  z: f32,
  ring: f32,
};

struct NodeOutput {
  projX: f32,
  projY: f32,
  depth: f32,
  scale: f32,
};

struct Uniforms {
  angleY: f32,
  pitchX: f32,
  zoom: f32,
  nodeCount: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> inNodes: array<NodeInput>;
@group(0) @binding(2) var<storage, read_write> outNodes: array<NodeOutput>;

@compute @workgroup_size(64)
fn computeTopologyProjection(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= u.nodeCount) {
    return;
  }

  let node = inNodes[index];

  // 1. Rotation around Y-axis
  let cosY = cos(u.angleY);
  let sinY = sin(u.angleY);
  let x1 = node.x * cosY - node.z * sinY;
  let z1 = node.x * sinY + node.z * cosY;

  // 2. Rotation around X-axis (pitch)
  let cosX = cos(u.pitchX);
  let sinX = sin(u.pitchX);
  let y2 = node.y * cosX - z1 * sinX;
  let z2 = node.y * sinX + z1 * cosX;

  // 3. Orthographic projection with subtle perspective scale
  let perspectiveFocal = 600.0;
  let scaleFactor = (perspectiveFocal / (perspectiveFocal + z2)) * u.zoom;

  var out: NodeOutput;
  out.projX = x1 * scaleFactor;
  out.projY = y2 * scaleFactor;
  out.depth = z2;
  out.scale = scaleFactor;

  outNodes[index] = out;
}
