'use client';

export function GlowingCube() {
	return (
		<div className='relative flex items-center justify-center py-4'>
			<div className='cube-container'>
				<div className='cube'>
					<div className='cube-face cube-face-front'></div>
					<div className='cube-face cube-face-back'></div>
					<div className='cube-face cube-face-left'></div>
					<div className='cube-face cube-face-right'></div>
					<div className='cube-face cube-face-top'></div>
					<div className='cube-face cube-face-bottom'></div>
				</div>
			</div>
			<style jsx>{`
				.cube-container {
					width: 60px;
					height: 60px;
					perspective: 600px;
				}

				.cube {
					width: 100%;
					height: 100%;
					position: relative;
					transform-style: preserve-3d;
					animation: rotateCube 8s linear infinite;
				}

				.cube-face {
					position: absolute;
					width: 60px;
					height: 60px;
					border: 2px solid #10b981;
					background: rgba(16, 185, 129, 0.05);
					box-shadow:
						0 0 20px #10b981,
						inset 0 0 20px rgba(16, 185, 129, 0.2);
				}

				.cube-face-front {
					transform: translateZ(30px);
				}

				.cube-face-back {
					transform: rotateY(180deg) translateZ(30px);
				}

				.cube-face-left {
					transform: rotateY(-90deg) translateZ(30px);
				}

				.cube-face-right {
					transform: rotateY(90deg) translateZ(30px);
				}

				.cube-face-top {
					transform: rotateX(90deg) translateZ(30px);
				}

				.cube-face-bottom {
					transform: rotateX(-90deg) translateZ(30px);
				}

				@keyframes rotateCube {
					from {
						transform: rotateY(0deg);
					}
					to {
						transform: rotateY(360deg);
					}
				}
			`}</style>
		</div>
	);
}
