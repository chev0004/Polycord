export const discoveryBootstrapScript =
  "<script>(function(){var l=location.pathname.slice(1);if((l!=='en'&&l!=='ja')||location.search)return;var u='/api/discovery/bootstrap?&locale='+l;window.__polycordBootstrap={url:u,start:performance.now(),response:fetch(u,{cache:'no-store'}).catch(function(){})}})()</script>";
