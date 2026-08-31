import logo from '../assets/ascend-logo.webp';

export function AscendAnimatedLogo() {
  return (
    <div className="ascend-logo-wrap">
      <img src={logo} alt="Ascend" className="ascend-logo-img" />
      <div className="ascend-logo-glow" />
      <div className="ascend-logo-burst" />
    </div>
  );
}
