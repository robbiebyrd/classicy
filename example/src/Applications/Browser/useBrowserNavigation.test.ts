import { describe, expect, it } from "vitest";
import { extractOriginalUrl } from "./useBrowserNavigation";

const PROXY_HOST = "timemachine.911realtime.org";

describe("extractOriginalUrl", () => {
	it("extracts the original URL from a proxy-rewritten page link", () => {
		expect(
			extractOriginalUrl(
				"https://timemachine.911realtime.org/web/http://www.cnn.com/2000/ALLPOLITICS/stories/08/15/conv.wrap/index.html",
				PROXY_HOST,
			),
		).toBe(
			"http://www.cnn.com/2000/ALLPOLITICS/stories/08/15/conv.wrap/index.html",
		);
	});

	it("keeps the original URL's query string and fragment", () => {
		expect(
			extractOriginalUrl(
				"https://timemachine.911realtime.org/web/http://www.time.com/r0/in?http://www.time.com/time/#top",
				PROXY_HOST,
			),
		).toBe("http://www.time.com/r0/in?http://www.time.com/time/#top");
	});

	it("skips a timestamp in a proxy-rewritten link", () => {
		expect(
			extractOriginalUrl(
				"https://timemachine.911realtime.org/web/20000815000000/http://www.cnn.com/",
				PROXY_HOST,
			),
		).toBe("http://www.cnn.com/");
	});

	it("extracts the url param from a proxy fetch URL", () => {
		expect(
			extractOriginalUrl(
				"https://timemachine.911realtime.org:443/?url=http%3A%2F%2Fwww.cnn.com%2F&time=20000815000000",
				PROXY_HOST,
			),
		).toBe("http://www.cnn.com/");
	});

	it("extracts the original URL from an archive.org link", () => {
		expect(
			extractOriginalUrl(
				"https://web.archive.org/web/19970101000000id_/http://www.apple.com/",
				PROXY_HOST,
			),
		).toBe("http://www.apple.com/");
	});

	it("extracts a timestamp-less rewrite served from another proxy hostname", () => {
		expect(
			extractOriginalUrl(
				"http://localhost:8765/web/http://www.cnn.com/WEATHER/",
				PROXY_HOST,
			),
		).toBe("http://www.cnn.com/WEATHER/");
	});

	it("leaves ordinary links alone", () => {
		expect(
			extractOriginalUrl("http://www.cnn.com/2000/index.html", PROXY_HOST),
		).toBeNull();
		expect(
			extractOriginalUrl("http://www.example.com/web/about.html", PROXY_HOST),
		).toBeNull();
	});
});
