import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as Tone from 'tone'
import { CubeCamera, WebGLCubeRenderTarget } from 'three';
import { ShaderMaterial, Color } from 'three';
import * as TWEEN from '@tweenjs/tween.js';



var vertexShader = `
  varying vec3 vUv; 

  void main() {
    vUv = position; 

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition; 
  }
`;

var fragmentShader = `
  uniform vec3 color;
  varying vec3 vUv;

  void main() {
    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.speed = 0.01; // decrease this value to slow down the camera


camera.position.z = 5;

const ambientLight = new THREE.AmbientLight(0xffffff, .5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x7a7a7a, .5);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const loader = new GLTFLoader();
let mesh;

loader.load('model.glb',
    function(gltf) {
        mesh = gltf.scene.children[0];
        scene.add(gltf.scene);
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
            }
        });
        
    },
    function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
        console.log('An error happened', error);
    }
);


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();



window.addEventListener('mousedown', onMouseClick, false);
// Same setup and loading code as before...
// Same setup and loading code as before...
// Assuming the images are named 'front.jpg', 'back.jpg', etc.
let bgloader = new THREE.TextureLoader();
let bgTexture = bgloader.load('background.jpg');
let bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture, side: THREE.BackSide });
let bgMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 60, 40), bgMaterial);
bgMesh.scale.setScalar(1000);
bgMesh.name = 'background';
scene.add(bgMesh);
renderer.autoClear = true;
const synthTypes = {
    'synth1': Tone.Synth,
    'synth2': Tone.AMSynth,
    'synth3': Tone.FMSynth,
    'synth4': Tone.MonoSynth,
    // add more as needed
};

let materials = [
    new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xff0000) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    }),
    new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x00ff00) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    }),
    new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x0000ff) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    }),
    new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x4b0082) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    }),
];

// let coloredLights = [];
function normalize(value, min, max) {
    return (value - min) / (max - min);
}

function mapPositionToNote(position, object) {
    object.geometry.computeBoundingBox();
    let normalizedPosition = new THREE.Vector3(
        normalize(position.x, object.geometry.boundingBox.min.x, object.geometry.boundingBox.max.x),
        normalize(position.y, object.geometry.boundingBox.min.y, object.geometry.boundingBox.max.y),
        normalize(position.z, object.geometry.boundingBox.min.z, object.geometry.boundingBox.max.z)
    );

    if(normalizedPosition.y < 0.15) {
        return { note: 'C4', synthType: 'synth1', material: materials[0] };
    } else if(normalizedPosition.y < 0.3) {
        return { note: 'D4', synthType: 'synth4', material: materials[1] };
    } else if(normalizedPosition.y < 0.45) {
        return { note: 'E6', synthType: 'synth2', material: materials[2] };
    }else if(normalizedPosition.y < 0.6) {
        return { note: 'E5', synthType: 'synth1', material: materials[0] };
    }else if(normalizedPosition.y < 0.75) {
        return { note: 'E4', synthType: 'synth2', material: materials[1] };
    }else if(normalizedPosition.y < 0.9) {
        return { note: 'G4', synthType: 'synth3', material: materials[2] };
    } else {
        return { note: 'B4', synthType: 'synth4', material: materials[3] };
    }
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(scene.children, true);

    // filter out the background
    intersects = intersects.filter(intersect => intersect.object.name !== 'background');
    
    if(intersects.length > 0) {
        let intersect = intersects[0];
        let { note, synthType, material } = mapPositionToNote(intersect.point, intersect.object);
        let synth = new synthTypes[synthType]().toDestination();
        synth.triggerAttackRelease(note, '8n');

        // Tween material color
        new TWEEN.Tween(intersect.object.material.color)
            .to(material.color, 5000) // duration in milliseconds
            .start();

        // add a colored light at the clicked location
        let coloredLight = new THREE.PointLight(material.color, .61, 100);
        coloredLight.position.copy(intersect.point);
        scene.add(coloredLight);
        // coloredLights.push(coloredLight);

        // Tween light intensity
        new TWEEN.Tween(coloredLight)
            .to({ intensity: 0 }, 500) // fade out in 1 second
            .onComplete(() => scene.remove(coloredLight)) // remove light from scene when fade out complete
            .start();
    }
}


function updateBackground() {
    const cubeRenderTarget = new WebGLCubeRenderTarget(64, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
    });

    const cubeCamera = new CubeCamera(0.1, 1000, cubeRenderTarget);
    cubeCamera.position.copy(camera.position);
    cubeCamera.update(renderer, scene);

    scene.background = cubeRenderTarget.texture;
}



// ... same animate function and call to animate function



function animate() {
    
    requestAnimationFrame(animate);

    controls.update();
    // gradually dim the colored lights
    // for (let coloredLight of coloredLights) {
    //     coloredLight.intensity -= 0.01;
    //     if (coloredLight.intensity <= 0) {
    //         scene.remove(coloredLight);
    //         coloredLights = coloredLights.filter(light => light !== coloredLight);
    //     }
    // }
    

    renderer.render(scene, camera);
    
    TWEEN.update(); // Add this line
    updateBackground();
}

animate();