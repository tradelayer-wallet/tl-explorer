use std::path::Path;
use tl_explorer_api::{
    external_href, link_for, link_type_of, mock_file, parse_u64, search, Address, Endpoint, Error,
    Link, LinkType, Page, PropertyCacheType, Txid,
};

const ADDR: &str = "MK3MqrS7PSkjcdiEyCNB92w74vfAEveZnu";
const TX: &str = "a7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806";

fn a() -> Address {
    Address::parse(ADDR).unwrap()
}
fn t() -> Txid {
    Txid::parse(TX).unwrap()
}

#[test]
fn endpoint_paths_match_the_legacy_templates() {
    let cases = [
        (
            Endpoint::ValidateAddress(a()),
            format!("/addresses/{ADDR}/validate/"),
        ),
        (
            Endpoint::Balance(a()),
            format!("/tl_getAllBalancesForAddress/{ADDR}"),
        ),
        (
            Endpoint::UnvestedBalance(a()),
            format!("/addresses/{ADDR}/unvested_balance"),
        ),
        (Endpoint::Properties, "/tl_listproperties".into()),
        (Endpoint::Property(3), "/tl_getproperty/3".into()),
        (
            Endpoint::PropertyCurrencyTotal(3),
            "/token/3/currency_total".into(),
        ),
        (
            Endpoint::PropertyCache(3, PropertyCacheType::Total),
            "/tl_propertyFeeCache/3".into(),
        ),
        (
            Endpoint::PropertyVestingInfo(3),
            "/token/3/vesting_info".into(),
        ),
        (
            Endpoint::ltc_volume(3, 10, 20).unwrap(),
            "/token/3/ltc_volume?startBlock=10&endBlock=20".into(),
        ),
        (Endpoint::Contract(1), "/contracts/1".into()),
        (
            Endpoint::ContractOpenInterest(1),
            "/contracts/1/open_interest".into(),
        ),
        (
            Endpoint::ContractTradeHistory(1),
            "/contracts/1/trade_history".into(),
        ),
        (
            Endpoint::ContractTradeHistoryUnfiltered(1),
            "/contracts/1/trade_history_unfiltered".into(),
        ),
        (Endpoint::NativeContracts, "/contracts/natives".into()),
        (Endpoint::OracleContracts, "/tl_listoracles".into()),
        (Endpoint::ChainInfo, "/tl_getchaininfo".into()),
        (Endpoint::Top10Blocks, "/tl_gettop10blocks".into()),
        (
            Endpoint::Transaction(t()),
            format!("/tl_gettransaction/{TX}"),
        ),
        (
            Endpoint::TransactionsForAddress(a()),
            format!("/tl_gettransactionsforaddress/{ADDR}"),
        ),
        (
            Endpoint::TransactionsForBlock(834692),
            "/tl_gettransactionsforblock/834692".into(),
        ),
    ];
    for (e, p) in cases {
        assert_eq!(e.path(), p);
    }
    assert_eq!(Endpoint::ltc_volume(3, 20, 10), Err(Error::BadRange));
}

#[test]
fn route_parameters_cannot_inject_path_segments() {
    for bad in [
        "",
        "../tl_listproperties",
        "a/b",
        "a?x=1",
        "a#f",
        "a%2F",
        "a b",
        "ä",
        &"x".repeat(129),
    ] {
        assert_eq!(Address::parse(bad), Err(Error::BadAddress), "{bad:?}");
    }
    assert!(Txid::parse(&TX[..63]).is_err());
    assert!(Txid::parse(&format!("{}g", &TX[..63])).is_err());
    assert_eq!(Txid::parse(&TX.to_uppercase()).unwrap().as_str(), TX);
    for bad in ["", "-1", "1e3", "12abc", "01", " 1", "18446744073709551616"] {
        assert_eq!(parse_u64(bad), Err(Error::BadNumber), "{bad:?}");
    }
    assert_eq!(parse_u64("0"), Ok(0));
    assert_eq!(parse_u64("18446744073709551615"), Ok(u64::MAX));
}

#[test]
fn page_routes_round_trip() {
    let pages = [
        Page::Home,
        Page::Address(a()),
        Page::Block(834692),
        Page::LastWinners,
        Page::Tx(t()),
        Page::Property(3),
        Page::Contract(1),
    ];
    for p in pages {
        assert_eq!(Page::parse(&p.path()), Some(p.clone()), "{}", p.path());
    }
    for bad in [
        "",
        "/nope",
        "/tx/zz",
        "/blocks/12abc",
        "/addresses/a/b",
        "/blocks/",
        "//",
    ] {
        assert_eq!(Page::parse(bad), None, "{bad}");
    }
    assert_eq!(Page::Home.path(), "/");
}

#[test]
fn search_classification() {
    assert_eq!(search(TX), Some(Page::Tx(t())));
    assert_eq!(search("834692"), Some(Page::Block(834692)));
    // Legacy parseInt("3J98t1...") = 3 sent this address to block 3.
    let p2sh = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
    assert_eq!(
        search(p2sh),
        Some(Page::Address(Address::parse(p2sh).unwrap()))
    );
    assert_eq!(search(ADDR), Some(Page::Address(a())));
    assert_eq!(search(""), None);
    assert_eq!(search("../etc"), None);
}

#[test]
fn property_links() {
    assert_eq!(link_type_of("issuer"), Some(LinkType::Address));
    assert_eq!(link_type_of("creationtxid"), Some(LinkType::Transaction));
    assert_eq!(link_type_of("propertyid"), Some(LinkType::Property));
    assert_eq!(link_type_of("blockid"), Some(LinkType::Blocks));
    assert_eq!(link_type_of("url"), Some(LinkType::Url));
    assert_eq!(link_type_of("name"), None);
    assert_eq!(
        link_for(LinkType::Address, ADDR),
        Some(Link::Internal(Page::Address(a())))
    );
    assert_eq!(
        link_for(LinkType::Contract, "7"),
        Some(Link::Internal(Page::Contract(7)))
    );
    assert_eq!(link_for(LinkType::Contract, "../tx/1"), None);
    assert_eq!(link_for(LinkType::Transaction, "nothex"), None);
}

#[test]
fn external_links_are_plain_http_urls() {
    assert_eq!(
        external_href("tradelayer.org/docs"),
        Some("https://tradelayer.org/docs".into())
    );
    assert_eq!(
        external_href("http://example.com/a?b=1"),
        Some("http://example.com/a?b=1".into())
    );
    assert_eq!(
        external_href("HTTPS://Example.com"),
        Some("https://Example.com".into())
    );
    for bad in [
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        "data:text/html,x",
        "httpx://evil.com",
        "http://user@evil.com",
        "https://",
        "https://localhost",
        "evil.com\" onmouseover=\"x",
        "http://evil.com\\@good.com",
        "mailto:a@b.c",
        "",
        "ftp://example.com",
    ] {
        assert_eq!(external_href(bad), None, "{bad}");
    }
}

#[test]
fn mock_api_paths_stay_inside_data() {
    assert_eq!(
        mock_file("/tokens/3/cache"),
        Some("tokens/3/cache.json".into())
    );
    assert_eq!(
        mock_file("/token/3/ltc_volume?startBlock=1&endBlock=2"),
        Some("token/3/ltc_volume.json".into())
    );
    assert_eq!(mock_file("/tokens.json"), Some("tokens.json".into()));
    for bad in [
        "/../package.json",
        "/tokens/../../server.js",
        "/./tokens",
        "//etc/passwd",
        "/",
        "",
        "tokens",
        "/a\\b",
        "/a%2f..",
    ] {
        assert_eq!(mock_file(bad), None, "{bad}");
    }
}

#[test]
fn committed_mock_fixtures_resolve() {
    let data = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../mock-api/data");
    for url in [
        format!("/addresses/{ADDR}"),
        format!("/addresses/{ADDR}/balance"),
        format!("/addresses/{ADDR}/unvested_balance"),
        "/chain/info".into(),
        "/chain/last_winners".into(),
        "/contracts/natives".into(),
        "/contracts/oracles".into(),
        "/tokens".into(),
        "/tokens/3/vesting_info".into(),
        format!("/tx/{}", "0".repeat(64)),
    ] {
        let rel = mock_file(&url).unwrap();
        assert!(data.join(&rel).is_file(), "{url} -> {rel}");
    }
}
