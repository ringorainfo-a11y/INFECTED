// =========================
// INFECTED - Game Engine v0.1
// =========================

const startButton = document.getElementById("startButton");
const loading = document.getElementById("loading");

let scene;
let camera;
let renderer;

startButton.addEventListener("click", startGame);

function startGame(){

    loading.style.display = "none";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    camera.position.set(0,2,5);

    renderer = new THREE.WebGLRenderer({
        antialias:true
    });

    renderer.setSize(window.innerWidth,window.innerHeight);

    document.body.appendChild(renderer.domElement);
    createWorld(scene);

    // Licht
    const light = new THREE.HemisphereLight(0xffffff,0x222222,2);
    scene.add(light);

    // Boden
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100,100),
        new THREE.MeshStandardMaterial({
            color:0x1f3322
        })
    );

    ground.rotation.x = -Math.PI/2;

    scene.add(ground);

    // Test-Würfel
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(),
        new THREE.MeshStandardMaterial({
            color:0xaa2222
        })
    );

    cube.position.y = 0.5;

    scene.add(cube);

    animate();

}

function animate(){

    requestAnimationFrame(animate);

    renderer.render(scene,camera);

}

window.addEventListener("resize",()=>{

    if(!camera) return;

    camera.aspect = window.innerWidth/window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth,window.innerHeight);

});
