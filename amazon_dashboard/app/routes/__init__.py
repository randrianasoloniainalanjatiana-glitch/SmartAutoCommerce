from .api          import api_bp
from .comparateur import comparateur_bp
from .veille      import veille_bp
from .sourcing    import sourcing_bp
from .catalogue   import catalogue_bp
from .smart_market_watch import smart_market_watch_bp

__all__ = [
    "api_bp",
    "comparateur_bp",
    "veille_bp",
    "sourcing_bp",
    "catalogue_bp",
    "smart_market_watch_bp",
]
