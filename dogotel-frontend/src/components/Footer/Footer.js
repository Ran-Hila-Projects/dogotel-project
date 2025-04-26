import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <h3 className="footer-title">Meet the Creators</h3>
      <div className="creators">
        <div className="creator">
          <h4>Hila Tsivion</h4>
          <p>211413216</p>
          <a href="mailto:hilatsivion@gmail.com">hila.tsivion@gmail.com</a>
        </div>
        <div className="creator">
          <h4>Ran Meshulam</h4>
          <p>208211292</p>
          <a href="mailto:ranmesh16@gmail.com">ranmesh16@gmail.com</a>
        </div>
      </div>
      <p className="footer-bottom">© 2025 All rights reserved.</p>
    </footer>
  );
}

export default Footer;
