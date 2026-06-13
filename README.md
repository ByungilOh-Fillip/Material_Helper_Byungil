# 🎨 Material Helper (머티리얼 헬퍼)

> **Unreal Engine 5 Material Shader Learning & Prototyping Sandbox**
>
> 본 프로젝트는 언리얼 엔진 5(UE5)의 머티리얼 에디터 노드 시스템을 웹 환경에서 직관적으로 학습하고 프로토타이핑할 수 있도록 돕는 웹 애플리케이션입니다. 노드를 연결하고 실시간 셰이더 시뮬레이션을 보며, 작업한 노드 구조를 그대로 언리얼 엔진에 붙여넣기(T3D Export)할 수 있습니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 인터랙티브 노드 에디터 (Sandbox)
* **다양한 노드 지원**: `ScalarParameter`, `VectorParameter`, `TexCoord`, `Time`, `Sine`, `Add`, `Multiply`, `Lerp`, `SphereMask`, `BoxMask`, `ConeMask`, `Material Result (FinalColor)` 등 지원.
* **스마트 연결 제어 (isValidConnection)**: 자기 자신과의 연결(Self-loop), 입력 단자 중복 연결, Output-to-Output 연결 등 잘못된 노드 배선 실수를 사전에 차단합니다.
* **직관적인 노드 레이아웃**: 노드 타이틀과 구분선 아래에 **Input(입력)과 Output(출력) 단자를 좌우 2단 정렬**하여 한눈에 파악하기 쉬운 최신 에디터 UX를 적용했습니다.

### 2. 고해상도 라이브 뷰포트 (Visualizer)
* **40x40 고해상도 그리드**: 총 1,600개의 시뮬레이션 픽셀을 통해 원, 사각형, 부채꼴 등의 형태를 부드럽고 매끄러운 디테일로 실시간 시뮬레이션합니다.
* **3가지 시각화 모드**:
  1. **Color Blend (컬러 블렌딩)**: 노드에 의해 제어된 색상들의 최종 합성 결과를 보여줍니다.
  2. **Motion Shape (모션 셰이프)**: 애니메이션과 알파 마스크의 형태를 흑백 채널로 분석합니다.
  3. **Debug Node (수치 디버깅)**: 각 노드가 현재 프레임에서 계산한 정확한 소수점 수치(마스크 값, 펄스 파형 등)를 출력합니다.

### 3. 언리얼 엔진 5 완벽 연동 (Copy to UE)
* **T3D 포맷 익스포트**: 선택된 노드들 혹은 그래프 전체를 언리얼 엔진 머티리얼 에디터의 표준 복사 포맷인 T3D 텍스트로 변환해 클립보드에 복사합니다.
* **연결 정보 완벽 보존**: 노드의 상대적 위치(`MaterialExpressionEditorX/Y`)는 물론, 언리얼 엔진이 노드 선 연결을 복원하는 핵심 요소인 `CustomProperties Pin (LinkedTo=...)`을 완벽하게 재구성하여 복사하므로, 언리얼 엔진 에디터 안에서 **`Ctrl+V`**를 누르면 선 연결과 파라미터가 그대로 복원됩니다.

### 4. 시나리오 학습 레시피 (Learning Recipes)
* **초급부터 고급까지**: 기본적인 원형 마스크, 곱하기 연산을 통한 크기 조절부터 실전 MMORPG에서 자주 쓰이는 **Circular Telegraph (원형 장판)**, **Cone Telegraph (부채꼴 장판)**, **Box Telegraph (직사각형 장판)** 스킬 영역 표시용 애니메이션 셰이더 예제를 제공합니다.
* **원클릭 로드**: 예제를 클릭하면 노드 구성과 변수가 즉시 샌드박스 에디터에 로드됩니다.

### 5. 노드 백과사전 (Encyclopedia)
* 머티리얼 제작에 쓰이는 노드들의 원리, 사용 목적, 권장 수치 범위, 초보자가 범하기 쉬운 실수, 버전별 주의사항을 한글로 알기 쉽게 정리해 놓았습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Framework**: React (Vite, TypeScript)
* **Graph Library**: React Flow (`@xyflow/react` v12)
* **3D Viewport**: Three.js (WebGLRenderer)
* **Styling**: Vanilla CSS (sleek dark mode design system)
* **Icons**: Lucide React
* **Deployment**: GitHub Actions + GitHub Pages

---

## 📄 라이선스 (License)
This project is licensed under the MIT License.
